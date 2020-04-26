import { Table } from './table/table';
import { Model } from './Model';
import { Query } from './Query';
import { Serializer } from './Serializer';

/**
 * Type annotation for a class, which can be 'newed' to create an instance
 */
type Newable<T> = {new(...args: any[]): T};

/**
 * Options passed into the ModelClass decorator
 */
interface ModelClassOptions {
    table: Table;
    queryClass?: typeof Query;
    serializerClass?: typeof Serializer;
}

/**
 * Decorates a model class to attach database functionality to it
 * @param options data about the model class and associated classes
 */
export function ModelClass(options: ModelClassOptions): Function {
    return function<T>(modelClass: Newable<T>): Newable<T> {

        // Store the metadata globally
        Model['_tables'].push({
            modelClass: modelClass,
            table: options.table,
			queryClass: options.queryClass,
            serializerClass: options.serializerClass,
            bulkFetch: {}
        });

        // Return the class, unaltered
        return modelClass;

    };
}
