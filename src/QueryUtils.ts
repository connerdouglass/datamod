import { $equals, QueryFilterFunctions } from './QueryFilterFunctions';

interface IQueryFilter_Basic {[key: string]: string | number | boolean | IQueryFilter | any[];}
interface IQueryFilter_And {$and: IQueryFilter[];}
interface IQueryFilter_Or {$or: IQueryFilter[];}
interface IQueryFilter_Nand {$nand: IQueryFilter[];}
interface IQueryFilter_Nor {$nor: IQueryFilter[];}

export type IQueryFilter =
	IQueryFilter_Basic |
	IQueryFilter_And |
	IQueryFilter_Or |
	IQueryFilter_Nand |
	IQueryFilter_Nor;

export class QueryUtils {

    /**
     * Generates a MySQL query string from some filters
     * @param filters the filters to convert to a query
     * @param placeholders the placeholders to pair with "?" in the query
     */
    public static generateSelectWhere(filters: IQueryFilter, placeholders: any[]): string | null {

        // Get the values
        const parts: any[] = Object
			.keys(filters || {})
            .map(key => {

                // Get the value
				const value: any = filters[key];

                // If the key is $or or $and
                if (['$or', '$and', '$nor', '$nand'].includes(key)) {

                    // Filter the values
                    const values: string[] = value
                        .map(subFilters => QueryUtils.generateSelectWhere(subFilters, placeholders))
                        .filter(v => v !== null);

                    // If there are no values
                    if (values.length === 0) return null;

                    // Map the values
                    const query: string = '(' + values
                        .join(['$or', '$nor'].includes(key) ? ' OR ' : ' AND ') + ')';

                    // If the value is NOT
                    if (['$nor', '$nand'].includes(key)) return `(NOT ${query})`;
                    else return query;

                }

                // Convert the value to a MySQL function call
                return QueryUtils.generateSelectWhereFunction(key, value, placeholders);

            })
            .filter(v => v !== null);

        // If there are no parts
        if (parts.length === 0) return null;

        // Return the filters
        return '(' + parts.join(' AND ') + ')';

    }

    /**
     * Generates a comparison MySQL query string
     * @param key the key for the item being set
     * @param value the value being set
     * @param placeholders the placeholders being added to
     */
    private static generateSelectWhereFunction(key: string, value: any, placeholders: any[]): any {

		// Format the key
		const formattedKey: string = QueryUtils.formatKey(key);

        // If the value is an object
        if (value && typeof value === 'object') {

			// Loop through the function names
			for (let fnName in QueryFilterFunctions.functions) {

                // If the function name is not in the keys
                if (!(fnName in value)) continue;

                // Call the function and return the value
                return QueryFilterFunctions.functions[fnName](formattedKey, value[fnName], placeholders);

            }

        }

        // Return a simple equals
        return $equals(formattedKey, value, placeholders);

	}

	/**
	 * Formats a key from the filter to its final MySQL query form
	 * @param key the key to format
	 */
	private static formatKey(key: string): string {

		// If it's just a string with word values, it's probably a key
		if (key.match(/^\w+$/)) return `\`${key}\``;

		// If it includes a question mark
		if (key.includes('?')) throw new Error(`Key cannot include '?' symbol: '${key}'`);

		// Anything else, we can return it raw probably
		return key;

	}

}
