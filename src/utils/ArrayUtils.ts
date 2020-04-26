export class ArrayUtils {

    /**
     * Filters an array asynchronously
     * @param array the array over which to filter
     * @param fn the function to use for filtering
     */
    public static async filterAsync(array: any[], fn: Function): Promise<any[]> {

        // Create an output array
        let results: any[] = [];

        // Loop through the array
        for (let i = 0; i < array.length; i++) {

            // Run the function on the item
            const result: boolean = await fn(array[i], i, array);

            // If the result is true
            if (result) results.push(array[i]);

        }

        // Return the results
        return results;

    }

    /**
     * Maps an array asynchronously
     * @param array the array to map
     * @param fn the function to use to map
     */
    public static async mapAsync(array: any[], fn: Function): Promise<any[]> {

        // Create an output array
        let results: any[] = [];

        // Loop through the array
        for (let i = 0; i < array.length; i++) {

            // Run the function on the item
            const result: boolean = await fn(array[i], i, array);

            // If the result is true
            if (result) results.push(result);

        }

        // Return the results
        return results;

    }

    /**
     * Reduces an array asynchronously
     * @param array the array to reduce
     * @param fn the function to use to reduce
     * @param initialValue the initial value for the reduction
     */
    public static async reduceAsync(array: any[], fn: Function, initialValue: any): Promise<any[]> {

        // Create an output array
        let result: any = initialValue;

        // Loop through the array
        for (let i = 0; i < array.length; i++) {

            // Run the function on the item
            result = await fn(result, array[i], i, array);

        }

        // Return the result
        return result;

    }

    /**
     * Sorts an array asynchronously
     * @param array the array to sort
     * @param fn the function to use to sort
     */
    public static async sortAsync(array: any[], fn: Function): Promise<any[]> {

        // Changes made in the previous iteration
        let changes: number = 1;

        // Loop until it's sorted
        while (changes > 0) {

            // No changes yet for this iteration
            changes = 0;

            // Loop through the length of the array
            for (let i = 0; i < array.length - 1; i++) {
                const a: any = array[i];
                const b: any = array[i + 1];
                const pairResult: number = await fn(a, b);
                if (pairResult > 0) {
                    array[i] = b;
                    array[i + 1] = a;
                    changes++;
                }
            }

        }

        // Return the results
        return array;

	}

	/**
	 * Returns a new array with the same contents as the original array, but with duplicates removed
	 * @param originalArray the original array to use
	 * @param matcher the matching function to decide if two items are equal
	 */
	public static removeDuplicates<T = any>(
		originalArray: T[],
		matcher: (a: T, b: T) => boolean = ((a, b) => a === b)): T[] {

		// Create an array of items that can be updated
		const array: T[] = [...originalArray];

		// Loop through the
		for (let i = 0; i < array.length; i++) {

			// Loop through the rest of the array to the right
			for (let j = i + 1; j < array.length; j++) {

				// If they are the same value
				if (matcher(array[i], array[j])) {

					// Remove the rightValue from the array
					array.splice(j, 1);
					j--;

				}

			}
		}

		// Return the new array
		return array;

	}

	/**
	 * Ensures that a value is an array. If the value passed in is not an array, it is
	 * wrapped in one.
	 * @param value the value to arrayify
	 */
	public static arrayify<T = any>(value: T | T[]): T[] {

		// If the value is already an array
		if (Array.isArray(value)) return value;

		// Otherwise, make it into an array
		return [value];

	}

}
