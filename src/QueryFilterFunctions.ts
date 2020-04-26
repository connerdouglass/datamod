import { Model } from './Model';
import { Query } from './Query';

interface IQueryFilterFunctions {
    functions: {
		[key: string]: ((key: string, valueOrSymbol: any, placeholders: any[]) => string)
	};
}


/**
 * A function for inserting symbols or values into a query string
 */
export const QueryFilterFunctions: IQueryFilterFunctions = {
    functions: {
        '$like': $like,
        '$contains': $contains,
        '$sha256': $sha256,
		'$in': $in,
		'$inSubquery': $inSubquery,
		'$notInSubquery': $notInSubquery,
        '$notIn': $notIn,
        '$equals': $equals,
        '$equalsNot': $equalsNot,
        '$is': $is,
        '$isNot': $isNot,
        '$lt': $lt,
        '$lte': $lte,
        '$gt': $gt,
        '$gte': $gte,
        '$regex': $regex,
		'$notRegex': $notRegex,
		'$listContains': $listContains
	}
};


/**
 * Inserts a placeholder to the running query string
 * @param valueOrSymbol the value or symbol to insert
 */
function insert(valueOrSymbol: any, placeholders: any[]): string {

	// If the value is a subquery object
	if (valueOrSymbol instanceof Query) {

		// Get the query and placeholders for the subquery
		const [queryString, ph]: [string, any[]] = valueOrSymbol.getQuery();

		// Inject the placeholders
		if (ph) placeholders.push(...ph);

		// Return the query string
		return `(${queryString})`;

	}

    // If the value is a column value
    if (typeof valueOrSymbol === 'string' && valueOrSymbol.startsWith('$')) {

        // Remove the first $ character
        const key: string = valueOrSymbol.substring(1);

        // Add the symbol directly to the string
        return '`' + key + '`';

    }

    // If the value is a boolean value
    if (typeof valueOrSymbol === 'boolean') {
        return valueOrSymbol ? '1' : '0';
    }

    // If the value has an 'id' field in it
    if (valueOrSymbol instanceof Model) valueOrSymbol = valueOrSymbol['id'];

    // Add a placeholder value
	placeholders.push(valueOrSymbol);

    return '?';

}

export function $equals(key: string, valueOrSymbol: any, placeholders: any[]): string {
    if (valueOrSymbol === null) {
        return `${key} IS NULL`;
    }
    return `${key} = ${insert(valueOrSymbol, placeholders)}`;
}

export function $equalsNot(key: string, valueOrSymbol: any, placeholders: any[]): string {
    return `(NOT (${$equals(key, valueOrSymbol, placeholders)}))`;
}

export function $like(key: string, valueOrSymbol: any, placeholders: any[]): string {
    return `${key} LIKE ${insert(valueOrSymbol, placeholders)}`;
}

export function $regex(key: string, valueOrSymbol: any, placeholders: any[]): string {
    return `${key} REGEXP ${insert(valueOrSymbol, placeholders)}`;
}

export function $notRegex(key: string, valueOrSymbol: any, placeholders: any[]): string {
    return `(NOT (${$regex(key, valueOrSymbol, placeholders)}))`;
}

export function $contains(key: string, valueOrSymbol: any, placeholders: any[]): string {
    return `${key} LIKE CONCAT('%', ${insert(valueOrSymbol, placeholders)}, '%')`;
}

export function $listContains(key: string, valueOrSymbol: any, placeholders: any[]): string {
	return `FIND_IN_SET(${insert(valueOrSymbol, placeholders)}, ${key}) > 0`;
}

export function $sha256(key: string, valueOrSymbol: any, placeholders: any[]): string {
    return `${key} = SHA2(${insert(valueOrSymbol, placeholders)}, 256)`;
}

export function $inSubquery(key: string, valueOrSymbol: [string, Query<any>], placeholders: any[]): string {

	// Get the query and placeholders for the subquery
	const [queryString, ph]: [string, any[]] = valueOrSymbol[1]
		.selectColumns([valueOrSymbol[0]])
		.getQuery();

	// Inject the placeholders
	if (ph) placeholders.push(...ph);

	// Return the query string
	return `${key} IN (${queryString})`;

}

export function $notInSubquery(key: string, valueOrSymbol: any[], placeholders: any[]): string {
	return `(NOT (${$notInSubquery(key, valueOrSymbol, placeholders)}))`;
}

export function $in(key: string, valueOrSymbol: any, placeholders: any[]): string {
	if (Array.isArray(valueOrSymbol) && valueOrSymbol.length === 0) return 'FALSE';
	if (valueOrSymbol instanceof Query) return `${key} IN ${insert(valueOrSymbol, placeholders)}`;
    return '(' + valueOrSymbol
        .map(val => {
			if (typeof val === 'string') return `${key} LIKE ${insert(val, placeholders)}`;
			else return `${key} = ${insert(val, placeholders)}`;
		})
        .join(' OR ') + ')';
}

export function $notIn(key: string, valueOrSymbol: any, placeholders: any[]): string {
    if (Array.isArray(valueOrSymbol) && valueOrSymbol.length === 0) return '';
    return `(NOT (${$in(key, valueOrSymbol, placeholders)}))`;
}

export function $is(key: string, valueOrSymbol: any, placeholders: any[]): string {
    return `${key} IS ${insert(valueOrSymbol, placeholders)}`;
}

export function $isNot(key: string, valueOrSymbol: any, placeholders: any[]): string {
    return `${key} IS NOT ${insert(valueOrSymbol, placeholders)}`;
}

export function $lt(key: string, valueOrSymbol: any, placeholders: any[]): string {
    return `${key} < ${insert(valueOrSymbol, placeholders)}`;
}

export function $lte(key: string, valueOrSymbol: any, placeholders: any[]): string {
    return `${key} <= ${insert(valueOrSymbol, placeholders)}`;
}

export function $gt(key: string, valueOrSymbol: any, placeholders: any[]): string {
    return `${key} > ${insert(valueOrSymbol, placeholders)}`;
}

export function $gte(key: string, valueOrSymbol: any, placeholders: any[]): string {
    return `${key} >= ${insert(valueOrSymbol, placeholders)}`;
}
