import { Table } from '../table/table';

export interface IConnection {

    /**
     * Gets a table object from the database
     * @param name the name of the table
     */
    getTable(name: string): Table;

    /**
     * Runs a query on the database and returns a Promise to the results
     * @param query the query string to eecute
     * @param values the values to insert to the query
     */
    query(query: string, values?: any): Promise<any>;

	/**
	 * Executes a query and handles the results as a stream, using a handler function.
	 * @param query the query to execute
	 * @param values the placeholder values to insert
	 * @param handleRow a function to execute to handle a single row at a time
	 * 
	 * TODO: Incorporate this into the library more. It would be nice to handle all serialization in a stream, directly
	 * 		 from database to JSON without store a bunch of data in memory intermediarily.
	 */
    stream(query: string, values: any, handleRow: ((row: any) => void | Promise<void>)): Promise<void>;
    
}