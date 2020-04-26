import { Table } from './table/table';
import { Model } from './Model';
import { IModel } from './Model.types';
import { IQueryFilter, QueryUtils } from './QueryUtils';
import { QueryWhere } from './QueryWhere';
import { ArrayUtils } from './utils/ArrayUtils';

export enum QuerySortDirection {
    ASCENDING = 'ASC',
    DESCENDING = 'DESC'
}

export interface IQuerySortOption {
    key: string;
    direction: QuerySortDirection;
}

interface IQueryTransformFunction {
    type: 'map' | 'reduce' | 'filter' | 'sort';
    fn: Function;
    extraValue?: any;
}

enum QueryResultType {
	MULTIPLE = 'multiple',
	IDS_ONLY = 'ids_only',
    SINGLE = 'single',
    COUNT = 'count',
    COUNT_EQ = 'count_eq',
    COUNT_LT = 'count_lt',
    COUNT_LTE = 'count_lte',
    COUNT_GT = 'count_gt',
    COUNT_GTE = 'count_gte'
}

export class Query<T> {

    /**
     * Filters that have been applied to the query. They are stored in an array,
     * and merged together upon exec() using a logical AND of them all.
     */
    private filters: IQueryFilter[] = [];

    /**
     * The upper limit on the number of items to retrieve from the query.
     * If the value is undefined (or otherwise not a positive integer), the
     * query will return all matches with no limit.
     */
	private limitCount?: number;

	/**
	 * The offset to apply along with the limit
	 */
	private limitOffset?: number;

    /**
     * Sorting options for the query.
     */
    private sortValue: IQuerySortOption[] = [];

    /**
     * Transform functions that have been applied to this query to run
     * automatically after the query returns items.
     */
    private transformFunctions: IQueryTransformFunction[] = [];

    /**
     * The type of result that is being generated (multiple items, one item, just the count, etc.)
     */
	private resultType: QueryResultType = QueryResultType.MULTIPLE;

	/**
	 * Whether or not to just find no results
	 */
	private findNone: boolean = false;

    /**
     * The target number to compare with when we're returning EQ, LT, GT, etc. results
     */
    private resultCountTarget?: number;

    /**
     * Tracks whether or not the 'if' function has been called and has failed. This flag
     * remembers that the 'if' failed, and is used to block whatever action immediately
     * follows the invocation of 'if'.
     */
    private ifFailedIgnoreNextAddition: boolean = false;

    /**
     * Whether or not to log the query before running it
     */
	private shouldLogQuery: boolean = false;

	/**
	 * The columns to select in the query
	 */
	private columnsToSelect: string | string[] = ['id'];

    /**
     * Constructs a query object on a table with some filters
     * @param table the model table over which to run the query
     * @param filters the filters to add to the query
     * @param modelClass the model class to use
     */
    public constructor(
        private table: Table,
        filters: IQueryFilter[],
        private modelClass: typeof Model) {

        // If some filters were provided, add them
        if (filters) this.filters.push(...filters.filter(f => !!f));

	}

	/**
	 * Creates a copy of this query object
	 */
	public copy(): Query<T> {

		// Create the other query object
		const query: Query<T> = new Query<T>(
			this.table,
			[...this.filters],
			this.modelClass
		);

		// Copy the values over
		query.limitCount = this.limitCount;
		query.limitOffset = this.limitOffset;
		query.sortValue = [...this.sortValue];
		query.transformFunctions = [...this.transformFunctions];
		query.resultType = this.resultType;
		query.findNone = this.findNone;
		query.resultCountTarget = this.resultCountTarget;
		query.ifFailedIgnoreNextAddition = this.ifFailedIgnoreNextAddition;
		query.shouldLogQuery = this.shouldLogQuery;
		query.columnsToSelect = Array.isArray(this.columnsToSelect)
			? [...this.columnsToSelect]
			: this.columnsToSelect;

		// Return the copy object
		return query;

	}

    /**
     * Runs an action conditionally, depending on the result of any
     * immediately preceding call to 'if'
     * @param successAction the action to run if we're not blocked by the condition
     * @param failureAction the action to run if we're blocked
     */
    private dependOnIfResult<K>(successAction: any | (() => any), failureAction: any | (() => any)): any {

        // If we've been blocked by the 'if' condition
        if (this.ifFailedIgnoreNextAddition) {

            // Set the flag to false
            this.ifFailedIgnoreNextAddition = false;

            // Call the failure action
            return failureAction();

        }

        // Call the success action
        return successAction();

	}

	/**
	 * Informs the query to return no results
	 */
	public none(): this {
		return this.dependOnIfResult(
			() => {

				// We're finding nothing
				this.findNone = true;

				// Return this query
				return this;

			},
			() => this);
	}

	/**
	 * Sets the columns to be selected
	 * @param columns the columns to select
	 */
	public selectColumns(columns: string | string[]): this {
		return this.dependOnIfResult(
            () => {

				// Mark the columns to return
				this.columnsToSelect = columns;

				// Return this query
				return this;

            },
            () => this);
	}

	/**
	 * Informs the query to return only the identifiers
	 */
	public idsOnly(): this {
		return this.dependOnIfResult(
            () => {

                // Set the 'ids only' flag to true
				this.resultType = QueryResultType.IDS_ONLY;
				this.columnsToSelect = ['id'];

                // Return this query
                return this;

            },
            () => this);
	}

	/**
	 * Informs the query to actually return all results
	 */
	public multiple(): this {
		return this.dependOnIfResult(
            () => {

                // Set the 'finding multiple' flag to true
                this.resultType = QueryResultType.MULTIPLE;

                // Return this query
                return this;

            },
            () => this);
	}

    /**
     * Informs the query to return only one single result
     */
    public onlyOne(): this {
        return this.dependOnIfResult(
            () => {

                // Set the 'finding only one' flag to true
                this.resultType = QueryResultType.SINGLE;

                // Return this query
                return this;

            },
            () => this);
    }

    /**
     * Tests against a condition provided, and allows or blocks the call on this query
     * that comes immediately after this one
     * @param condition the condition value to test against
     * @param fn the function to run if the condition succeeds (optional)
     */
    public if(condition: any, fn?: ((query: Query<T>) => any)): this {

        // If there was a function provided
        if (fn) {

            // If the condition is successful, run the function
            if (condition) fn(this);

            // Return this query
            return this;

        }

        // If there wasn't a function, set the flag appropriately to block
        // or allow whatever action comes immediately after this one.
        this.ifFailedIgnoreNextAddition = !condition;

        // Return this query
        return this;

    }

    /**
     * Informs the query to only return the count, instead of actual
     * model item results.
     */
    public count(): this {
        return this.dependOnIfResult(
            () => {

                // We're finding just the count
                this.resultType = QueryResultType.COUNT;

                // Return this query
                return this;

            },
            () => this);
    }

    /**
     * Informs the query to determine if any resulting rows are found
     */
    public exists(): this {
        return this.countGreaterThan(0);
    }

    /**
     * Informs the query to determine if any resulting rows are found
     */
    public hasAny(): this {
        return this.exists();
    }

    /**
     * Informs the query to return a boolean value based on the count
     * @param count the count to compare the number of results to
     */
    public countEquals(count: number): this {
        return this.dependOnIfResult(
            () => {

                // We're finding out if the count is equal to something
                this.resultType = QueryResultType.COUNT_EQ;
                this.resultCountTarget = count;

                // Return this query
                return this;

            },
            () => this);
    }

    /**
     * Informs the query to return a boolean value based on the count
     * @param count the count to compare the number of results to
     */
    public countLessThan(count: number): this {
        return this.dependOnIfResult(
            () => {

                // We're finding out how the count compares to something
                this.resultType = QueryResultType.COUNT_LT;
                this.resultCountTarget = count;

                // Return this query
                return this;

            },
            () => this);
    }

    /**
     * Informs the query to return a boolean value based on the count
     * @param count the count to compare the number of results to
     */
    public countLessThanOrEqual(count: number): this {
        return this.dependOnIfResult(
            () => {

                // We're finding out how the count compares to something
                this.resultType = QueryResultType.COUNT_LTE;
                this.resultCountTarget = count;

                // Return this query
                return this;

            },
            () => this);
    }

    /**
     * Informs the query to return a boolean value based on the count
     * @param count the count to compare the number of results to
     */
    public countGreaterThan(count: number): this {
        return this.dependOnIfResult(
            () => {

                // We're finding out how the count compares to something
                this.resultType = QueryResultType.COUNT_GT;
                this.resultCountTarget = count;

                // Return this query
                return this;

            },
            () => this);
    }

    /**
     * Informs the query to return a boolean value based on the count
     * @param count the count to compare the number of results to
     */
    public countGreaterThanOrEqual(count: number): this {
        return this.dependOnIfResult(
            () => {

                // We're finding out how the count compares to something
                this.resultType = QueryResultType.COUNT_GTE;
                this.resultCountTarget = count;

                // Return this query
                return this;

            },
            () => this);
    }

    /**
     * Sets the query to log the raw MySQL query before executing it
     */
    public logQuery(): this {
        return this.dependOnIfResult(
            () => {

                // We should log the query
                this.shouldLogQuery = true;

                // Return this query
                return this;

            },
            () => this);
    }

    /**
     * Adds a condition to the WHERE portion of the query filters
	 * @param key the key to add a condition to
     */
    public where(key: string): QueryWhere<T, this>;

	/**
	 * Adds a condition to the WHERE portion with some filter values
	 * @param filter the filter object
	 */
	public where(filter: IQueryFilter): this;

	public where(keyOrFilter: string | IQueryFilter): QueryWhere<T, this> | this {

		// If the value passed in is a key
		if (typeof keyOrFilter === 'string') return this.dependOnIfResult(
            () => new QueryWhere<T, this>(this, keyOrFilter),
			() => new QueryWhere<T, this>(this, keyOrFilter, true));

		// Otherwise, treat it as a filter
		else return this.dependOnIfResult(
			() => {

				// Add the filters to the array
				this.filters.push(keyOrFilter);

				// Return this query
				return this;

			},
			() => this);

	}

	/**
	 * Adds a series of conditions, and requires all to be true
	 * @param filters the filters to require all of
	 */
	public whereAll(...filters: IQueryFilter[]): this {
		return this.where({
			$and: filters
		});
	}

	/**
	 * Adds a series of conditions, and required at least one to be true
	 * @param filters the filters to require at least one of
	 */
	public whereSome(...filters: IQueryFilter[]): this {
		return this.where({
			$or: filters
		});
	}

    /**
     * Limits the number of results to return
     * @param limit the limit to add to the query
     */
    public limit(limit: number): this {
        return this.dependOnIfResult(
            () => {

                // Set the limit count
				this.limitCount = limit;

                // Return the query
                return this;

            },
            () => this);
	}

	/**
	 * Applies an offset to the result set
	 * @param offset the number of rows to offset results
	 */
	public offset(offset: number): this {
		return this.dependOnIfResult(
            () => {

                // Set the limit offset
				this.limitOffset = offset;

                // Return the query
                return this;

            },
            () => this);
	}

    /**
     * Adds a sorting key or function to the query. Functions are executed AFTER the query returns results,
     * while sort keys and directions are included in the query. As such, functional sorting used in conjunction
     * with a limit is likely to exclude some results.
     * @param sortValue the sort data, key string(s), or sorting function to use
     */
    public sort(sortValue: IQuerySortOption | string | (IQuerySortOption | string)[] | ((a: any, b: any) => number)): this {
        return this.dependOnIfResult(
            () => {

                // If the sort value is a function
                if (sortValue.constructor.name === 'Function' || sortValue.constructor.name === 'AsyncFunction') {

                    // Add it as a sort
                    this.transformFunctions.push({
                        type: 'sort',
                        fn: sortValue as Function
                    })

                    // Return the query
                    return this;

                }

                // Get the values as an array
                const values: (IQuerySortOption | string)[] = (Array.isArray(sortValue) ? sortValue : [sortValue]) as any;

                // Add the sort values
                this.sortValue.push(...values.map(sv => {

                    // If the sort value is a string
                    if (typeof sv === 'string') {

                        // Create the basic sort object
                        return {
                            key: sv,
                            direction: QuerySortDirection.ASCENDING
                        };

                    } else {

                        // The default direction is ascending
                        if (!sv.direction) sv.direction = QuerySortDirection.ASCENDING;

                        // Keep the object together
                        return sv;

                    }
                }));

                // Return this query
                return this;

            },
            () => this);
    }

    /**
     * Attaches a function to execute on resulting objects to map them to other values
     * @param mapFn the function to use to map results
     */
    public map(mapFn: ((result: T | any) => any)): this {
        return this.dependOnIfResult(
            () => {

                // Add the map function to the list
                this.transformFunctions.push({
                    type: 'map',
                    fn: mapFn
                });

                // Return this query
                return this;

            },
            () => this);
    }

    /**
     * Attaches a function to execute on resulting objects to reduce them to another structure
     * @param fn the function to use to reduce values
     * @param initialValue the initial value for the reduce
     */
    public reduce(fn: ((accum: any, item: any, index: number, items: any[]) => any), initialValue: any): this {
        return this.dependOnIfResult(
            () => {

                // Add the reduce function to the list
                this.transformFunctions.push({
                    type: 'reduce',
                    fn: fn,
                    extraValue: initialValue
                });

                // Return this query
                return this;

            },
            () => this);
    }

    /**
     * Attaches a function to execute on the query results to filter some out
     * @param fn the function to use to filter results
     */
    public filter(fn: ((item: any, index: number, items: any[]) => boolean | Promise<boolean>)): this {
        return this.dependOnIfResult(
            () => {

                // Add the filter function to the list
                this.transformFunctions.push({
                    type: 'filter',
                    fn: fn
                });

                // Return this query
                return this;

            },
            () => this);
    }

    /**
     * Executes a MySQL SELECT query to find models
     * @param query the MySQL SELECT query string
     * @param modelClass the model class for the query
     * @param placeholders the placeholders to inject
	 * @param gettingAllColumns whether or not the query got all columns
     */
    public async executeQuery(query: string, modelClass: typeof Model | null, placeholders?: any[], gettingAllColumns?: boolean): Promise<(Model | number)[]> {

        // If we need to log the query
        if (this.shouldLogQuery) console.log(query, placeholders);

        // Run the query on the database
		const results: IModel[] = await this.table.getConnection().query(query, placeholders);

		// If the results are not an array
		if (!results || !Array.isArray(results)) return [];

		// If the model class is not provided, return just the identifiers
        if (!modelClass) return results
            .map(result => result.id)
            .filter(id => id && typeof id === 'number') as number[];

		// Map the results to the model class
        return results.map(result => new modelClass(result));

    }

    /**
     * Gets the array of keys to select
     */
    private getKeysToSelect(): string[] {

		// If we're finding only the count
        if ([   QueryResultType.COUNT,
			QueryResultType.COUNT_EQ,
			QueryResultType.COUNT_LT,
			QueryResultType.COUNT_LTE,
			QueryResultType.COUNT_GT,
			QueryResultType.COUNT_GTE].includes(this.resultType)) return ['COUNT(*) AS `count`'];

		// Make sure the columns are in an array
		const cols: string[] = Array.isArray(this.columnsToSelect) ? this.columnsToSelect : [this.columnsToSelect];

		// Filter and map them
		return cols
			.filter(col => col && typeof col === 'string')
			.map(col => col.trim())
			.map(col => {

				// If it contains a space, assume it's SQL code
				if (col.includes(' ') || col.includes('`') || col === '*') return col;

				// Wrap the column name in tildes
				return '`' + col + '`';

			});

	}

    /**
     * Gets the query for the request
     */
    public getQuery(): [string, any[]] {

        // Create an array for the placeholders
        const placeholders: any[] = [];

        // Create an array for the keys to select
        const keysToSelect: string[] = this.getKeysToSelect();

        // Create the string query, selecting the keys
        let query: string = 'SELECT ' + keysToSelect.join(', ') + ' FROM `' + this.table.getTableName() + '`';

        // If there are filters, join them
        if (this.filters.length > 0) query += ' WHERE ' + QueryUtils.generateSelectWhere({$and: this.filters}, placeholders);

        // If there is a sort value (or multiple)
        if (this.sortValue.length > 0) {

            // Add the ORDER BY parts, joined by commas
            query += ' ORDER BY ';
            query += this.sortValue
                .map((sort: IQuerySortOption) => {

                    // If the key is random
                    if (sort.key === 'random') return 'RAND()';

                    // Otherwise, return the key and direction
                    return '`' + sort.key + '`' + ' ' + sort.direction

                })
                .join(', ');

		}

		// Determine if there is an offset
		const hasLimit: boolean = (this.limitCount !== undefined && this.limitCount > 0);
		const hasOffset: boolean = (this.limitOffset !== undefined && this.limitOffset > 0);

		// If either one is present
		if (hasLimit || hasOffset) {

			// If there is an offset
			const limitValue: string = hasLimit ? (this.limitCount as number).toFixed(0) : '18446744073709551615';
			const offsetValue: string = hasOffset ? (this.limitOffset as number).toFixed(0) : '0'

			// Apply the limit to the query
			query += ` LIMIT ${offsetValue}, ${limitValue}`

		}

        // Return the query and the placeholders
        return [query, placeholders];

    }

    /**
     * Executes the query and returns results
	 * @param logQuery whether or not to log the query
     */
    public async exec(logQuery: boolean = false): Promise<T | any | Array<T | any>> {

        // Create the string query value
		const [query, placeholders]: [string, any[]] = this.getQuery();

		// If we're logging the query
		if (logQuery) {

			// Log the query
			console.log('START QUERY----------');
			console.log(query);
			console.log(placeholders);
			console.log('END QUERY------------');

		}

        // If we're finding only the count
        if ([   QueryResultType.COUNT,
                QueryResultType.COUNT_EQ,
                QueryResultType.COUNT_LT,
                QueryResultType.COUNT_LTE,
                QueryResultType.COUNT_GT,
                QueryResultType.COUNT_GTE].includes(this.resultType)) {

			// Get the count of the results
			const count: number = await (async () => {

				// If we're finding none, the count is zero
				if (this.findNone) return 0;

				// Run the query directly on the database, without wrapping in instances
				const results: any[] = await this.table.getConnection().query(query, placeholders);

				// Return the count
				return results[0].count;

            })();
            
            // As long as the result count target is not undefined
            if (typeof this.resultCountTarget === 'number') {

                // If we're returning the count
                if (this.resultType === QueryResultType.COUNT) return count;
                else if (this.resultType === QueryResultType.COUNT_EQ) return count === this.resultCountTarget;
                else if (this.resultType === QueryResultType.COUNT_LT) return count < this.resultCountTarget;
                else if (this.resultType === QueryResultType.COUNT_LTE) return count <= this.resultCountTarget;
                else if (this.resultType === QueryResultType.COUNT_GT) return count > this.resultCountTarget;
                else if (this.resultType === QueryResultType.COUNT_GTE) return count >= this.resultCountTarget;

            }

		}

		// Get the results
		const results: any[] = await (async () => {

			// If we're finding nothing, return an empty array
			if (this.findNone) return [];

			// Run the query with the string
			let resultsInner: any[] = await this.executeQuery(
				query,
				this.resultType === QueryResultType.IDS_ONLY ? null : this.modelClass,
				placeholders,
				query.toUpperCase().startsWith('SELECT *')
			);

			// If we're finding only one, but have more than one, throw out all but the first
			if (this.resultType === QueryResultType.SINGLE && resultsInner.length > 1) resultsInner = [resultsInner[0]];

			// Loop through all the functions
			for (let transform of this.transformFunctions) {

				// Depending on the type, apply it
				if (transform.type === 'filter') resultsInner = await ArrayUtils.filterAsync(resultsInner, transform.fn);
				if (transform.type === 'map') resultsInner = await ArrayUtils.mapAsync(resultsInner, transform.fn);
				if (transform.type === 'sort') resultsInner = await ArrayUtils.sortAsync(resultsInner, transform.fn);
				if (transform.type === 'reduce') resultsInner = await ArrayUtils.reduceAsync(resultsInner, transform.fn, transform.extraValue);

			}

			// Return the results
			return resultsInner;

		})();

        // If we're only finding one, return just the first result
        if (this.resultType === QueryResultType.SINGLE) return results.length > 0 ? results[0] : null;

        // Otherwise, return all the results
        return results;

    }

}
