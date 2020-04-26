interface IModelInstance {
	instance: any;
	modelClass: any;
	expires: number;
}

export class ModelManager {

	/**
	 * The maximum lifespan of models
	 */
	private static readonly MODEL_MAXIMUM_LIFESPAN: number = 10000;

	/**
	 * The maximum number of cached models at any time
	 */
	private static readonly MAXIMUM_CACHED_INSTANCES: number = 2000;

	/**
	 * The interval between cleanup sweeps
	 */
	private static readonly CLEANUP_INTERVAL: number = 2500;

	/**
	 * The interval for cleaning up old model instances
	 */
	private static cleanupInterval: any;

	/**
	 * The data for registered instances
	 */
	private static instances: IModelInstance[] = [];

	/**
	 * Registers an instance in the system
	 * @param instance the instance itself
	 * @param modelClass the model class of the instance
	 */
	private static registerInstance(instance: any, modelClass: any): void {

		// Find the existing instance data
		let data: IModelInstance | undefined = this.instances.find(i => i.instance === instance);

		// Calculate the new expiration data
		const expires: number = Date.now() + this.MODEL_MAXIMUM_LIFESPAN;

		// If there is no instance
		if (!data) {

			// Push the instance to the array
			this.instances.push({
				instance,
				modelClass,
				expires
			});

			// Cap the length of the array
			while (this.instances.length > this.MAXIMUM_CACHED_INSTANCES) this.instances.shift();

		}

		// Otherwise update it
		else data.expires = Math.max(data.expires, expires);

		// If the cleanup interval doesn't exist yet
		if (!this.cleanupInterval) this.cleanupInterval = setInterval(() => this.cleanupExpired(), this.CLEANUP_INTERVAL);

	}

	/**
	 * Reuses an existing, matching model, or creates a new one
	 * @param id the identifier or constructor data for the model
	 * @param modelClass the class to use for the model
	 * @param savedData the data for the body of the model object, if all columns were selected
	 */
	public static createOrReuseInstance(id: number, modelClass: any, savedData?: any): any {

		// If there is an identifier
		if (id !== null && typeof id === 'number') {

			// Find the matching instance
			const data: IModelInstance | undefined = this.instances.find(i => i.instance.id === id && i.modelClass === modelClass);

			// If there is data
			if (data) {

				// Update the expiration data
				data.expires = Date.now() + this.MODEL_MAXIMUM_LIFESPAN;

				// If there is saved data, merge it in
				if (savedData) data.instance.savedData = Object.assign(
					{},
					data.instance.savedData,
					savedData
				);

				// Return the instance
				return data.instance;

			}

		}

		// Create an instance with the model class
		const instance = new modelClass(id);
		if (savedData) instance.savedData = savedData;

		// Add this instance to the array
		ModelManager.registerInstance(instance, modelClass);

		// Return the instance
		return instance;

	}

	/**
	 * Cleans up expires models
	 */
	private static cleanupExpired(): void {

		// Get the current timestamp
		const now: number = Date.now();

		// Loop through them and remove the expired ones
		while (this.instances.length > 0 && now >= this.instances[0].expires) this.instances.shift();

		// If there are no instances
		if (this.instances.length === 0 && this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;
		}

	}

}
