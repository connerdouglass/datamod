import { Query } from './Query';

export class QueryWhere<T, R = Query<T>> {

    /**
     * Constructs a query where object, which adds a filter to the query
     * @param query the query in which to add the resulting filter
     * @param key the key for which to add a filter
     * @param dummy if true, the filter will not actually be added to the query
     */
    public constructor(
        private query: R,
        private key: string,
        private dummy: boolean = false) {}

    /**
     * Runs an action depending on the status of the 'dummy' value
     * @param action the action to run if this isn't a dummy object
     */
    private dependOnDummyCondition(action: (() => void)): R {

        // If this isn't a dummy, run the action
        if (!this.dummy) action();

        // Return the query
        return this.query;

    }

    /**
     * Conditionally adds a filter to the query (if dummy is false)
     * @param value the value to test against
     */
    private conditionallyAddFilter(value: any): R {
        return this.dependOnDummyCondition(() => {
            this.query['filters'].push({
                [this.key]: value
            });
        });
    }

    public equals(value: any): R {
        return this.conditionallyAddFilter(value);
    }

    public notEquals(value: any): R {
        return this.conditionallyAddFilter({$equalsNot: value});
    }

    public ciEquals(value: any): R {
        return this.conditionallyAddFilter({$ciEquals: value});
    }

    public notCiEquals(value: any): R {
        return this.conditionallyAddFilter({$ciEqualsNot: value});
    }

    public isGreaterThan(value: any): R {
        return this.conditionallyAddFilter({$gt: value});
    }

    public isGreaterThanOrEqualTo(value: any): R {
        return this.conditionallyAddFilter({$gte: value});
    }

    public isLessThan(value: any): R {
        return this.conditionallyAddFilter({$lt: value});
    }

    public isLessThanOrEqualTo(value: any): R {
        return this.conditionallyAddFilter({$lte: value});
    }

    public isLike(value: any): R {
        return this.conditionallyAddFilter({$like: value});
    }

    public regex(pattern: string): R {
        return this.conditionallyAddFilter({$regex: pattern});
    }

    public notRegex(pattern: string): R {
        return this.conditionallyAddFilter({$notRegex: pattern});
    }

    public contains(value: any): R {
        return this.conditionallyAddFilter({$contains: value});
	}

	public listContains(value: any): R {
		return this.conditionallyAddFilter({$listContains: value});
	}

    public in(value: any): R {
        return this.conditionallyAddFilter({$in: value});
	}

	/**
	 * Matches the value in the parent table column to any result from a subquery
	 * @param subqueryColumn the column to match with on the subquery table
	 * @param subquery the subquery to execute
	 */
	public inSubquery(subqueryColumn: string, subquery: Query<any>): R {
		return this.conditionallyAddFilter({$inSubquery: [subqueryColumn, subquery]});
	}

    public notIn(value: any): R {
        return this.conditionallyAddFilter({$notIn: value});
    }

    public is(value: any): R {
        return this.conditionallyAddFilter({$is: value});
    }

    public isNot(value: any): R {
        return this.conditionallyAddFilter({$isNot: value});
    }

    public isNull(): R {
        return this.is(null);
    }

    public isNotNull(): R {
        return this.isNot(null);
    }

}
