export class ObjectUtils {

    /**
	 * Merges a list of objects into one accumulated object
	 * @param objects the list of objects to combine
	 * @returns {any}
	 */
    public static merge(...objects: any[]): any {

        // If there are no objects
        if (objects.length === 0) return {};

        // Filter out the ones that aren't objects
        return objects
            .filter(object => (typeof object === 'object' && object !== null))
            .reduce((output, object) => {

                // Loop through the keys in the object
                Object.keys(object).forEach(key => {

                    // Copy the value into the output
                    output[key] = object[key];

                });

                // Return the output
                return output;

            }, {});

    }

    /**
     * Gets the value for a key path in an object
     * @param data the data to search
     * @param {string} keyPath the key path string
     * @param defaultValue the default value, optionally
     * @returns {any}
     */
    public static getValueAtKeyPath(data: any, keyPath: string, defaultValue?: any): any {

        // Split the key path components
        const keyPathComponents: string[] = keyPath.split('.');

        // Loop through the key path
        for (let i = 0; i < keyPathComponents.length; i++) {

            // If the object is not an object
            if (typeof data !== 'object' || data === null) return defaultValue;

            // Get the key path component
            const keyPathComponent: string = keyPathComponents[i];

            // If the key doesn't exist in the current data
            if (!data.hasOwnProperty(keyPathComponent)) return defaultValue;

            // Update the value object
            data = data[keyPathComponent];

        }

        // Return the current object
        return data;

    }

    /**
     * Sets the value for a particular key path in the data
     * @param data the data in which to insert a value
     * @param keyPath the key path at which to insert the data
     * @param value the value to insert to the data
     */
    public static setValueAtKeyPath(data: any, keyPath: string, value: any): void {

        // Split the key path components
        const keyPathComponents: string[] = keyPath.split('.');

        // Loop through the key path
        for (let i = 0; i < keyPathComponents.length - 1; i++) {

            // Get the component in the key path
            const keyPathComponent: string = keyPathComponents[i];

            // If the key doesn't exist in the data, create it
            if (!data.hasOwnProperty(keyPathComponent)) data[keyPathComponent] = {};

            // Update the data to this nested object
            data = data[keyPathComponent];

        }

        // Get the last component in the key path
        const finalKeyPathComponent: string = keyPathComponents[keyPathComponents.length - 1];

        // Insert the data at the index
        data[finalKeyPathComponent] = value;

    }

    /**
     * Selects a subset of an object with the provided key paths
     * @param data the larger data from which to pull
     * @param keyPaths the key paths to select
     */
    public static subsetWithKeyPaths(data: any, keyPaths: string[]): any {
        return keyPaths.reduce((output: any, keyPath: string) => {

            // Get the value for the key path in the data
            const value: any = ObjectUtils.getValueAtKeyPath(data, keyPath);

            // If there is a value
            if (typeof value !== 'undefined') ObjectUtils.setValueAtKeyPath(output, keyPath, value);

            // Return the output
            return output;

        }, {});
    }

    // /**
    //  * Gets an array of all key path in the data
    //  * @param data the data to get key paths for
    //  */
    // public static getAllKeyPaths(data: any): string[] {

    //     // Flatten the object and get the keys
    //     return Object.keys(ObjectUtils.flattenObject(data));

    // }

    // /**
    //  * Flattens a deep object to a single-level object
    //  * @param data the data to flatten
    //  * @param rootKeyPathComponents the key path components of parent objects
    //  * @param flatData the total output flat data
    //  */
    // public static flattenObject(data: any, rootKeyPathComponents: string[] = [], flatData: any = {}): any {

    //     // Create the prefix for key paths in this object
    //     const keyPathPrefix: string =
    //         (rootKeyPathComponents.length === 0)
    //         ? ''
    //         : (rootKeyPathComponents.join('.') + '.');

    //     // Loop through the keys in the data
    //     Object.keys(data).forEach(key => {

    //         // Get the value for the key
    //         const value: any = data[key];

    //         // If the value is an object with its own depth
    //         if (typeof value === 'object') {

    //             // Create the new level for the root
    //             const newRootComponents: string[] = [].concat(rootKeyPathComponents, key);

    //             // Flatten the data
    //             ObjectUtils.flattenObject(value, newRootComponents, flatData);

    //         } else {

    //             // Copy the value
    //             flatData[keyPathPrefix + key] = value;

    //         }

    //     });

    //     // Return the flat data
    //     return flatData;

    // }

    // /**
	//  * Converts an object literal to an array of key/value pairs
	//  * @param data the data to parse
	//  * @returns {any}
	//  */
    // public static toKeyValuePairs(data: any): {key: string, value: any}[] {
    //     return Object.keys(data).map((key: string) => ({
    //         key: key,
    //         value: data[key]
    //     }));
    // }

    // /**
	//  * Converts an array of key/value pairs to an object literal
	//  * @param {any} pairs the pairs array
	//  * @returns {{}}
	//  */
    // public static fromKeyValuePairs(pairs: {key: string, value: any}[]): {} {
    //     return pairs.reduce((output, pair) => {
    //         output[pair.key] = pair.value;
    //         return output;
    //     }, {});
    // }

}
