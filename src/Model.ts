import crypto from 'crypto';
import { Table } from './table/table';
import { IModel } from './Model.types';
import { ModelSerializer } from './ModelSerializer';
import { Query } from './Query';
import { IQueryFilter } from './QueryUtils';
import { ObjectUtils } from './utils/ObjectUtils';

interface IModelDirtyContext {
    changed: boolean;
    dirtyData: any;
    dirtyForeignObjects: any;
}

interface IDecoratorMetadata {
	modelClass: any;
	table: Table;
	queryClass?: any;
	serializerClass?: any;
    serializerInstance?: ModelSerializer;
    bulkFetch: any;
}

export class Model<T extends IModel = any> {

    /**
     * The table for the database
     */
	private static _tables: IDecoratorMetadata[] = [];

	/**
	 * Gets the decorator metadata for this class
	 */
	private static getDecoratorMetadata(): any {

		// Find the matching data
		return this._tables.find(t => t.modelClass === this) || null;

	}

    /**
     * Gets the table for the database
     */
    private static getTable(): Table | null {

        // Filter for matches
        const filtered: any[] = this._tables.filter(t => t.modelClass === this);

        // If there is one, return it
        if (Array.isArray(filtered) && filtered.length > 0) return filtered[0].table;

        // Return an error value
        return null;

    }

    /**
     * Gets the model class for the database
     */
    private static getModelClass(): (typeof Model) | null {

        // Filter for matches
        const filtered: any[] = this._tables.filter(t => t.modelClass === this);

        // If there is one, return it
        if (Array.isArray(filtered) && filtered.length > 0) return filtered[0].modelClass;

        // Return an error value
        return null;

    }

    /**
     * Gets the class to use for queries
     */
    private static getQueryClass(): typeof Query {

        // Filter for matches
        const filtered: any[] = this._tables.filter(t => t.modelClass === this);

        // If there is one, return it
        if (Array.isArray(filtered) && filtered.length > 0 && filtered[0].queryClass) return filtered[0].queryClass;

        // Return an error value
        return Query;

	}


	/**
	 * Gets the serializer instance for the model class
	 */
	public static getSerializer<TSerializer = ModelSerializer>(): TSerializer | null {

		// Get the decorator metadata
		const meta: IDecoratorMetadata = this.getDecoratorMetadata();

		// If there is no metadata
		if (!meta) return null;

		// If there is no serializer instance
		if (!meta.serializerInstance) {

			// If there is not a serializer class
			if (!meta.serializerClass) return null;

			// Create the serializer instance
			meta.serializerInstance = new (meta.serializerClass || ModelSerializer)();

		}

		// Return the serializer instance
		return meta.serializerInstance as any;

	}

    /**
     * Generates a query to find models matching the filters
     * @param filters the filters to use to create a query
     */
    public static find<Q extends Query<any> = Query<any>>(...filters: IQueryFilter[]): Q {

        // Get the query class
        const queryClass: any = this.getQueryClass();

        // Create the query object
        return new queryClass(this.getTable(), filters, this.getModelClass()) as Q;

	}

    /**
     * Executes a query and wraps results in model objects
     * @param query the query to execute
     * @param placeholders the placeholders
     */
    public static executeQuery(query: string, placeholders?: any[]): Promise<Model[]> {

        // Get the query class
        const queryClass: any = this.getQueryClass();

        // Create a query and execute it
        return new queryClass(
                this.getTable(),
                [{}],
                this.getModelClass())
            .executeQuery(
                query,
                this.getModelClass(),
                placeholders);
    }

    /**
     * Finds one model object in the database
     */
    public static findOne<Q extends Query<any> = Query<any>>(filters?: any): Q {
        return this.find<Q>(filters).onlyOne();
    }

    /**
     * Finds one model object corresponding to the provided id
     * @param id the identifier to look for
     */
    public static findById<Q extends Query<any> = Query<any>>(id: any | number): Q {
        return this.findOne<Q>().where('id').equals(id);
	}

	/**
	 * Finds one model object corresponding to the provided identifier hash
	 * @param idHash the identifier hash string
	 */
	public static findByIdHash<Q extends Query<any> = Query<any>>(idHash: string): Q {
		return this.findOne<Q>().where('SHA2(`id`, 256)').equals(idHash);
	}

    /**
     * Creates a query to count results
     * @param filters the filters for the query
     */
    public static count<Q extends Query<any> = Query<any>>(...filters: IQueryFilter[]): Q {

        // Get the query class
        const queryClass: any = this.getQueryClass();

        // Return the query object
        return new queryClass(this.getTable(), filters, this.getModelClass()).count() as Q;

    }

    /**
     * Gets the identifier of the object, or undefined if no identifier has been created
     * for this object yet.
     */
    public get id(): number | undefined {
        return this._id;
	}

	/**
	 * Gets the SHA256 hash of this object's identifier, as a hexadecimal string. If the object's
     * identifier is undefined, this method returns null instead of a hash.
	 */
	public get idHash(): string | null {

        // If the identifier is undefined
        if (typeof this._id !== 'number') return null;

        // Calculate and return the hash
        return crypto
            .createHash('sha256')
            .update(this._id?.toString())
            .digest('hex');
	}

    /**
     * The identifier for the row (may not be present)
     */
    private _id?: number;

    /**
     * Data for the model that has not been committed to the database
     */
    private dirtyStack: IModelDirtyContext[] = [{
        changed: false,
        dirtyData: {},
        dirtyForeignObjects: {}
    }];

    /**
     * Gets the object for the topmost dirty data
     */
    private get currentDirtyContext(): IModelDirtyContext {
        return this.dirtyStack[this.dirtyStack.length - 1];
    }

    /**
     * Gets the value for the saved data, plus all the edits
     */
    private getFlattenedData(): IModelDirtyContext {

        // Create the dirty data stack
        return {
            changed: this.dirtyStack.some(c => c.changed),
            dirtyData: Object.assign({}, this.savedData, ...this.dirtyStack.map(c => c.dirtyData)),
            dirtyForeignObjects: Object.assign({}, this.savedData, ...this.dirtyStack.map(c => c.dirtyForeignObjects))
            // dirtyData: ObjectUtils.merge(this.savedData, ...this.dirtyStack.map(c => c.dirtyData)),
            // dirtyForeignObjects: ObjectUtils.merge(this.savedData, ...this.dirtyStack.map(c => c.dirtyForeignObjects))
        };

    }

    /**
     * Data for the model that is saved in the database
     */
    private savedData?: T;

    /**
     * Constructs a blank new model
     */
    public constructor();

    /**
     * Constructs a model from identifier
     * @param id the identifier for the row
     */
    public constructor(id: number);

    /**
     * Constructs a new module with some data
     * @param data the data for the model
     * @param ignoreDefaults should default values be ignored
     */
    public constructor(data?: any, ignoreDefaults?: boolean);

    /**
     * Constructor implementation for models
     * @param arg0 identifier, data, or undefined
     * @param arg1 option flag
     */
    public constructor(arg0?: any, arg1?: any) {

        // Handle some errors
        if (arg0 === null) throw 'Invalid model constructor paramater: null';

        // If we're pulling an existing one
        if (typeof arg0 !== 'undefined' && (typeof arg0 === 'number' || ('id' in arg0 && typeof arg0.id === 'number'))) {

            // If the value is a number
            if (typeof arg0 === 'number') this._id = arg0;
            else this._id = arg0.id;

        } else {

            // If we should not ignore the default values
            if (!arg1) this.currentDirtyContext.dirtyData = this.getDefaultData();

            // If the value is undefined, do nothing else
            if (typeof arg0 !== 'undefined') {

                // Merge the data with the default data
                // this.currentDirtyContext.dirtyData = ObjectUtils.merge(this.currentDirtyContext.dirtyData, arg0);
                this.currentDirtyContext.dirtyData = Object.assign({}, this.currentDirtyContext.dirtyData, arg0);

            }

            // Flatten the foreign objects
            this.flattenForeignObjects();

		}

    }

    /**
     * Returns the default data to use for constructing
     */
    protected getDefaultData(): any {
        return {};
	}

	/**
	 * The handlers for getting the value of a field
	 */
	private fieldGetHandlers: {[key: string]: any[];} = {};

    /**
     * Gets the value for a column on the object
     * @param column the column value to get
     */
    public async get<K>(column: string): Promise<K> {

		// Loop through the dirty stack in reverse order
		for (let i = this.dirtyStack.length - 1; i >= 0; i--) {

			// If the object is in the foreign objects
			if (this.dirtyStack[i].dirtyForeignObjects && this.dirtyStack[i].dirtyForeignObjects[column])
				return this.dirtyStack[i].dirtyForeignObjects[column];

			// If the column exists in the dirty data
			if (this.dirtyStack[i].dirtyData && (column in this.dirtyStack[i].dirtyData))
				return this.dirtyStack[i].dirtyData[column];

		}

		// If the column exists in the saved data
		if (this.savedData && (column in this.savedData))
			return this.savedData[column];

		// Return a promise to the results
		return new Promise<K>(async (resolve, reject) => {

			// Create the array if needed
			if (!(column in this.fieldGetHandlers)) this.fieldGetHandlers[column] = [];

			// Add the resolve to the handlers
			this.fieldGetHandlers[column].push(resolve);

			// // Get the decorator metadata
			// const metadata = (this.constructor as any).getDecoratorMetadata();
			// if (!metadata.bulkFetch.columns) metadata.bulkFetch.columns = [];
			// if (!metadata.bulkFetch.columns.includes(column)) metadata.bulkFetch.columns.push(column);

			// If this is not the first
			if (this.fieldGetHandlers[column].length > 1) return;

			// Fetch the saved data
			await this.fetchSavedData();

			// Get the value for the column
			const valueToReturn: any = (!this.savedData || !(column in this.savedData))
				? undefined
				: this.savedData[column];

			// Resolve the value
			this.fieldGetHandlers[column].forEach(handler => handler(valueToReturn));
			delete this.fieldGetHandlers[column];

		});
    }

    /**
     * Gets the value of a column on the object as boolean. This uses
     * JavaScript logic to determine if the value should be treated as
     * true or false. The most typical use is to use an integer column
     * and treat 0 and 1 as false and true, respectively.
     * @param column the column value to get
     */
    public async getBoolean(column: string): Promise<boolean> {

        // Get the value of the number column
        const value: any = await this.get<any>(column);

        // Return the boolean value
        return !!value;

	}

	/**
	 * Gets the array of values listed on a column
	 * @param column the column name
	 * @param delimiter the delimiter string
	 */
	public async getListColumn(column: string, delimiter: string = ','): Promise<string[]> {

		// Get the string value for the column
		const listString: string = await this.get<string>(column);

		// If the list string is invalid
		if (!listString || typeof listString !== 'string' || listString.trim().length === 0) return [];

		// Split the string into parts
		return listString.split(delimiter);

	}

	/**
	 * Sets an array of values listed in a column
	 * @param column the column to set
	 * @param values the array of values to set
	 * @param delimiter the delimiter string
	 */
	public setListColumn(column: string, values: string[], delimiter: string = ','): void {

		// If the value is not an array, make it an array
		if (!values || !Array.isArray(values)) values = [];

		// Join the values to a list string
		const listString: string = values.join(delimiter);

		// Set the value for the column
		this.set(column, listString);

	}

    /**
     * Gets a foreign object value instance described by a column.
     * @param column the column value to get
     * @param modelClass the class for the foreign model
     */
    public async getForeignObject<K>(column: string, modelClass: any): Promise<K | null> {

        // Loop through the stack in reverse order
        for (let i = this.dirtyStack.length - 1; i >= 0; i--) {

            // Get the dirty foreign objects
            const dirtyForeignObjects: any = this.dirtyStack[i].dirtyForeignObjects;

            // If the object exists in the dirty objects, return it
            if (dirtyForeignObjects && (column in dirtyForeignObjects))
                return dirtyForeignObjects[column];

        }

        // Get the foreign identifier value
        const foreignID: number = await this.get<number>(column);

        // If the foreign id is not a number
        if (!foreignID || isNaN(foreignID)) return null;

		// Create the new object
		// return ModelManager.createOrReuseInstance(foreignID, modelClass);
        return new modelClass(foreignID);

    }

    /**
     * Gets the object from a JSON string column
     * @param column the column to get the object from
     */
    public async getJsonObject(column: string): Promise<{[key: string]: any}> {

        // Get the credentials string
		const credentialsString: string = await this.get<string>(column);

        try {

            // Parse the credentials string
            return JSON.parse(credentialsString);

        } catch (err) {

            // Return an empty object
            return {};

        }

    }

    /**
     * Sets the object for a JSON string column
     * @param object the credentials object to set
     */
    public setJsonObject(column: string, object: {[key: string]: any}): void {

        // Convert it to a JSON string
        const objectString: string = JSON.stringify(object);

        // Set the column value
        this.set(column, objectString);

    }

    /**
     * Gets the value for a key within an object on a column
     * @param column the column to pull the object from
     * @param key the key to find in the object
     * @param defaultValue the default value if nothing is found
     */
    public async getJsonObjectKey(column: string, key: string, defaultValue?: any): Promise<any> {

        // Get the data object
        const object: {[key: string]: string} = await this.getJsonObject(column);

        // Get the key value
        return ObjectUtils.getValueAtKeyPath(object, key, defaultValue);

    }

    /**
     * Sets the value for a key within an object on a column
     * @param column the column to pull the object from
     * @param key the key to set in the object
     * @param value the value to put on the key
     */
    public async setJsonObjectKey(column: string, key: string, value: any): Promise<void> {

        // Get the data object
        const object: {[key: string]: string} = await this.getJsonObject(column);

        // Set the key value
        ObjectUtils.setValueAtKeyPath(object, key, value);

        // Set the object string value
        this.setJsonObject(column, object);

    }

    /**
     * Sets a value for a column on the object
     * @param column the column to set
     * @param value the value to set in it
     */
    public set(column: string, value: any): void {

        // Get the latest edited values
        const edits: IModelDirtyContext = this.getFlattenedData();

        // If the value is a model
        if (value instanceof Model) {

            // If the object is already in the edits
            if (edits.dirtyForeignObjects[column] === value ||
                edits.dirtyData[column] === value._id) return;

            // Add the identifier to the column
            this.currentDirtyContext.dirtyData[column] = value._id;
            this.currentDirtyContext.dirtyForeignObjects[column] = value;
            this.currentDirtyContext.changed = true;

        } else {

            // If the value is exactly `true` set it to 1. Likewise,
            // set `false` to 0
            if (value === true) value = 1;
            else if (value === false) value = 0;

            // If the value is already in the edits
            if (edits.dirtyForeignObjects[column] === value) return;

            // Add the value to the dirty data
            this.currentDirtyContext.dirtyData[column] = value;
            this.currentDirtyContext.dirtyForeignObjects[column] = undefined;
            this.currentDirtyContext.changed = true;

        }

    }

    /**
     * Flushes changed dirty values
     */
    public flushChanges(): void {

        // Clear the data in the top context
        this.currentDirtyContext.dirtyData = {};
        this.currentDirtyContext.dirtyForeignObjects = {};

    }

    /**
     * Pushes a new editing context to the object
     */
    public push(): void {

        // Push a fresh context to the stack
        this.dirtyStack.push({
            changed: false,
            dirtyData: {},
            dirtyForeignObjects: {}
        });

    }

    /**
     * Pops the topmost editing context
     * @param merge whether or not to merge the values down. If `false`, changes are discarded
     */
    public pop(merge: boolean = false): void {

        // Pop the topmost context
        const poppedContext: IModelDirtyContext | undefined = this.dirtyStack.pop();

        // If we're left without an editing context, push a fresh one
        if (this.dirtyStack.length === 0) this.push();

        // If we're merging down
        if (merge) {

            // Merge the contexts
            // this.currentDirtyContext.dirtyData = ObjectUtils.merge(
            //     this.currentDirtyContext.dirtyData,
            //     poppedContext.dirtyData);
            // this.currentDirtyContext.dirtyForeignObjects = ObjectUtils.merge(
            //     this.currentDirtyContext.dirtyForeignObjects,
            //     poppedContext.dirtyForeignObjects);
            // this.currentDirtyContext.changed = this.currentDirtyContext.changed || poppedContext.changed;

            this.currentDirtyContext.dirtyData = Object.assign(
                {},
                this.currentDirtyContext.dirtyData,
                poppedContext?.dirtyData);
            this.currentDirtyContext.dirtyForeignObjects = Object.assign(
                {},
                this.currentDirtyContext.dirtyForeignObjects,
                poppedContext?.dirtyForeignObjects);
            this.currentDirtyContext.changed = this.currentDirtyContext.changed || (poppedContext?.changed ?? false);

        }

    }

    /**
     * Merges the entire editing stack downward to flatten it to one level
     */
    public flattenEditStack(): void {

        // Merge down to the root
        this.dirtyStack = [{
            changed: this.dirtyStack.some(c => c.changed),
            dirtyData: Object.assign({}, ...this.dirtyStack.map(c => c.dirtyData)),
            dirtyForeignObjects: Object.assign({}, ...this.dirtyStack.map(c => c.dirtyForeignObjects))
        }];

    }

    /**
     * Flattens foreign objects in the model data
     */
    private flattenForeignObjects(): void {

        // Loop through the dirty data
        Object
            .keys(this.currentDirtyContext.dirtyData)
            .forEach((key: string) => {

                // Get the object
                const val: any = this.currentDirtyContext.dirtyData[key];

                // If the value is an object
                if (val instanceof Model) {

                    // Set the value back to an id
                    this.currentDirtyContext.dirtyData[key] = val._id;
                    this.currentDirtyContext.dirtyForeignObjects[key] = val;

                }

            });

    }

    /**
     * Edits and saves some changes
     * @param handler the handler to execute changes
     */
    public async makeChanges(handler: () => void | Promise<void> | boolean | Promise<boolean>): Promise<void> {

        // Push an editing context
        this.push();

        // Run the edits
        const result: void | boolean = await handler();

        // If the result is explicitly false, don't save. Otherwise save.
        if (result !== false) await this.save();

        // Pop the context
        this.pop();

    }

    /**
     * Saves the model to the database
     */
    public async save(): Promise<void> {

        // If the data has been deleted (marked as null)
		if (this.currentDirtyContext.dirtyData === null) throw 'Cannot reinsert this object to the database.';

        // If there is not yet an id
        if (typeof this._id === 'undefined') {

            // Insert it to the database
            const results: any = await (this.constructor as any).getTable().getConnection().query('INSERT INTO `' + (this.constructor as any).getTable().getTableName() + '` SET ?', this.currentDirtyContext.dirtyData);

            // Save the data id
			this._id = results.insertId;

        } else {

            // If something has been changed
            if (this.currentDirtyContext.changed && this.currentDirtyContext.dirtyData && Object.keys(this.currentDirtyContext.dirtyData).length > 0) {

                // Update the row already in the datbase
                await (this.constructor as any).getTable().getConnection().query(
                    'UPDATE `' + (this.constructor as any).getTable().getTableName() + '` SET ? WHERE `id` = ?',
                    [this.currentDirtyContext.dirtyData, this._id]);

            }

        }

        // Clear the dirty data
        this.flushChanges();

        // Fetch the saved data from the database
        await this.fetchSavedData();

    }

    /**
     * Deletes the row from the database
     * @param recoverable should the data be recoverable with a save() call
     */
    public async delete(recoverable: boolean = false): Promise<void> {

        // If there is already no id
        if (!this.id) return;

        // If it should be recoverable
        if (recoverable) {

            // Fetch the saved data
            await this.fetchSavedData();

            // Move the clean data to the dirty data
            this.dirtyStack = [{
                changed: false,
                dirtyData: this.savedData,
                dirtyForeignObjects: {}
            }];
            this.dirtyStack[0].dirtyData.id = this.id;

            // Flush the saved data
            this.savedData = undefined;

        } else {

            // Flush all the data
            this.dirtyStack = [{
                changed: false,
                dirtyData: null,
                dirtyForeignObjects: null
            }];
            this.savedData = undefined;

        }

        // Delete the row from the database
        await (this.constructor as any).getTable().getConnection().query('DELETE FROM `' + (this.constructor as any).getTable().getTableName() + '` WHERE `id` = ? LIMIT 1', [this.id])

        // Set the identifier to undefined again
        this._id = undefined;

	}

	/**
	 * The handlers that are waiting for model saved data to resolve
	 */
	private fetchHandlers: ((value?: void | PromiseLike<void> | undefined) => void)[] = [];

    /**
     * Fetches the entire data for a row in the model
     * @param id the object row identifier
     */
	private static fetchSavedDataBulk(id: number): Promise<void> {
		return new Promise<void>(async (resolve, reject) => {

			// Get the decorator metadata
			const metadata = this.getDecoratorMetadata();

			// Add the handler to the array
			if (!metadata.bulkFetch.fetchSavedDataHandlers) metadata.bulkFetch.fetchSavedDataHandlers = [];
			metadata.bulkFetch.fetchSavedDataHandlers.push({
				id: id,
				fn: (rows: any[]) => resolve(rows.find(row => row.id === id))
			});

			// If there is already a timeout
			if (metadata.bulkFetch.fetchSavedDataTimeout) return;

			// Create the timeout value
			metadata.bulkFetch.fetchSavedDataTimeout = setTimeout(async () => {

				// Make a copy of the values
				const handlers = [...metadata.bulkFetch.fetchSavedDataHandlers];
				metadata.bulkFetch.fetchSavedDataHandlers = [];
				metadata.bulkFetch.fetchSavedDataTimeout = null;
				// const keys: string[] = [...(metadata.bulkFetch.columns || [])];
				// metadata.bulkFetch.columns = [];

				// Get all of the ids
				const ids: number[] = handlers.map(handler => handler.id);

				// Get the keys
				// const keysStr = (keys && keys.length > 0)
				// 	? keys.map(k => '`' + k + '`').join(', ')
				// 	: '*';
				const keysStr = '*';

				// Query for all of the rows
				const rows: any[] = await this.getTable()?.getConnection().query(
					'SELECT ' + keysStr + ' FROM `' + this.getTable()?.getTableName() + '` WHERE ' + ids.map(id => '`id` = ?').join(' OR '),
					[...ids]
				);

				// Call each handler
				handlers.forEach(handler => handler.fn(rows));

			}, 25);

		});
	}

    /**
     * Fetches the saved data for the promise
     */
    private async fetchSavedData(): Promise<void> {
		return new Promise<void>(async (resolve, reject) => {

			// Add the fetch handler
			this.fetchHandlers.push(resolve);

			// If we're not the first to ask for the data
			if (this.fetchHandlers.length > 1) return;

			// Fetch the data in bulk
			const row: any = await (this.constructor as any).fetchSavedDataBulk(this.id);

			// If there is a row, save it on the object
			if (row) this.savedData = row;

			// Call all of the handlers
			this.fetchHandlers.forEach(handler => handler());
			this.fetchHandlers = [];

		});
    }

	/**
	 * Serializes all of the data for the object
	 */
	public async serializeAll(): Promise<any> {

		// Fetch the saved data
        await this.fetchSavedData();

        // Merge the saved and dirty data
        return Object.assign({}, this.savedData, ...this.dirtyStack.map(c => c.dirtyData));

	}

}
