type SerializerActionFn<TObject, TSerialized, TFlag> = ((object: TObject, serialized: TSerialized, ctx: ISerializeActionContext<TFlag>) => any | Promise<any>);

interface SerializerAction<TObject, TSerialized, TFlag> {
	conditionalFlag?: TFlag;
	action: SerializerActionFn<TObject, TSerialized, TFlag>;
	serializesChild: boolean;
}

type SerializeFlags<TFlag> = TFlag[] | SerializeFlagsObject<TFlag>;

type SerializeFlagsObject<TFlag> = {
	flags: TFlag[];
	children: {[key: string]: SerializeFlags<TFlag>};
};

interface ISerializeActionContext<TFlag> {
	flags: TFlag[];
	children: {[key: string]: SerializeFlags<TFlag>};
}

export abstract class Serializer<TObject = any, TSerialized = any, TFlag = string> {

	/**
	 * Whether or not the serializer has been configured
	 */
	private configured: boolean = false;

	/**
	 * The actions to perform when serializing
	 */
	private actions: SerializerAction<TObject, TSerialized, TFlag>[] = [];

	/**
	 * Configures the serializer
	 */
	protected abstract configure(): void;

	/**
	 * Serializes the default data for an object
	 * @param object the object to serialize
	 * @param serialized the serialized object to populate to
	 */
	protected abstract serializeDefaultData(object: TObject, serialized: TSerialized): void;

	public serializeAsChild(object: TObject, ctx: ISerializeActionContext<TFlag>, key: string): Promise<TSerialized | null> {
		return this.serialize(
			object,
			ctx.children[key]
		);
	}

	public serializeAll(objects: TObject[], flags?: SerializeFlags<TFlag>): Promise<(TSerialized | null)[]> {
		const normalizedFlags: SerializeFlagsObject<TFlag> = this.normalizeFlags(flags);
		return Promise.all(objects.map(object => this.serialize(object, flags, normalizedFlags)));
	}

	public serializeAllAsChildren(objects: TObject[], ctx: ISerializeActionContext<TFlag>, key: string): Promise<(TSerialized | null)[]> {
		return Promise.all(objects.map(object => this.serializeAsChild(object, ctx, key)));
	}

	/**
	 * Serializes an object to some static data for transmission
	 * @param object the object to serialize
	 * @param flags the flags for details to include in the serialized data
	 */
	public async serialize(object: TObject, flags?: SerializeFlags<TFlag>, normalizedFlags?: SerializeFlagsObject<TFlag>): Promise<TSerialized | null> {

		// If the object is null
		if (!object) return null;

		// If the serializer has not been configured yet, configure it
		if (!this.configured) {
			this.configured = true;
			this.configure();
		}

		// Normalize the flags data
		if (!normalizedFlags) normalizedFlags = this.normalizeFlags(flags);

		// Create the context
		const ctx: ISerializeActionContext<TFlag> = {
			flags: normalizedFlags.flags,
			children: normalizedFlags.children
		};

		// Create the serialized data object
		const serialized: TSerialized = {} as any;

		// Serialize all of the default data (id, mainly)
		this.serializeDefaultData(object, serialized);

		// Loop through all of the actions
		for (let i = 0; i < this.actions.length; i++) {

			// Get the action at the index
			const action = this.actions[i];

			// If the flags don't match, skip it
			if (action.conditionalFlag && !ctx.flags.includes(action.conditionalFlag)) continue;

			// If the action serialized children
			if (action.serializesChild) {

				// Run the action into this object
				await action.action(object, serialized, ctx);

			} else {

				// The data object
				let data: any = {};

				// Run the action into this object
				await action.action(object, data, ctx);

				// Merge the data into the objec
				Object.assign(serialized, data);

			}

		}

		// Return the serialized object
		return serialized;

	}

	private normalizeFlags(inFlags?: TFlag[] | SerializeFlags<TFlag>): SerializeFlagsObject<TFlag> {

		// If there are no input flags
		if (!inFlags) return {
			flags: [],
			children: {}
		};

		// If the flags are an array
		if (Array.isArray(inFlags)) return {
			flags: inFlags,
			children: {}
		};

		// Return data with nothing missing
		return {
			flags: inFlags.flags || [],
			children: inFlags.children || {}
		};

	}

	/**
	 * Registers an action on the serializer
	 * @param action the action to register
	 * @param serializesChild whether or not this action serializes a child
	 */
	protected registerAction(action: SerializerActionFn<TObject, TSerialized, TFlag>, serializesChild: boolean = false): void {

		// Add the action to the array
		this.actions.push({
			action,
			serializesChild
		});

	}

	/**
	 * Registers an action to be performed on serialization calls when the provided flag is present
	 * @param flag the flag whose presence determines if the action is triggered
	 * @param action the action to execute if the flag is present
	 * @param serializesChild whether or not this action serializes a child
	 */
	protected registerFlagAction(flag: TFlag, action: SerializerActionFn<TObject, TSerialized, TFlag>, serializesChild: boolean = false): void {

		// Add the action to the array
		this.actions.push({
			conditionalFlag: flag,
			action,
			serializesChild
		});

	}

}
