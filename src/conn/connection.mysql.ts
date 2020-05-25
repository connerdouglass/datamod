import mysql from 'mysql';
import { Table } from '../table/table';
import { IConnection } from './connection';

export interface IDatabaseConnectionConfig {
	hostname: string;
	port?: number;
    user: string;
    password: string;
    database: string;
}

export class MysqlConnection implements IConnection {

    /**
     * Constructs a database connection object. Does not yet connect
     * until there is a query.
     * @param config the configuration for the connection
     */
    public constructor(
		private config: IDatabaseConnectionConfig) {}

	private connectionPool?: mysql.Connection[];
	private connectionPoolMaximum: number = 20;
	private lastConnectionIndex: number = -1;

	private getConnection(): mysql.Connection {

		// If there is no connection pool
		if (!this.connectionPool) {

			// Create the connection pool array
			this.connectionPool = [];

			// Create all of the connections
			while (this.connectionPool.length < this.connectionPoolMaximum) {

				// Create a new connection
				this.connectionPool.push(mysql.createConnection({
					host: this.config.hostname,
					user: this.config.user,
					port: this.config.port,
					password: this.config.password,
					database: this.config.database
				}));

			}

		}

		// Increment the connection index
		this.lastConnectionIndex = (this.lastConnectionIndex + 1) % this.connectionPool.length;

		// Return a connection from the pool
		return this.connectionPool[this.lastConnectionIndex];

	}

    /**
     * Runs a query on the database and returns a promise to the results
     * @param query the query string to execute
     * @param values the values to insert to the query
     */
    public query(query: string, values?: any): Promise<any> {
        return new Promise<any>((resolve, reject) => {

			// Get the database connection
			const connection: mysql.Connection | mysql.Pool = this.getConnection();

            // Run the query on the database
            connection.query(query, values, (error: mysql.MysqlError | null, results: any) => {

                // If there was an error
                if (error) {

                    // Log the error
                    console.error(error);

                    // Reject with the error
                    return reject(error);

				}

                // Resolve the results
                resolve(results);

			});

        });
	}

	/**
	 * Executes a query and handles the results as a stream, using a handler function.
	 * @param query the query to execute
	 * @param values the placeholder values to insert
	 * @param handleRow a function to execute to handle a single row at a time
	 * 
	 * TODO: Incorporate this into the library more. It would be nice to handle all serialization in a stream, directly
	 * 		 from database to JSON without store a bunch of data in memory intermediarily.
	 */
	public stream(query: string, values: any, handleRow: ((row: any) => void | Promise<void>)): Promise<void> {
		return new Promise<any>((resolve, reject) => {

			// Get the database connection
			const connection: mysql.Connection | mysql.Pool = this.getConnection();

			// Run the query on the database
			const queryObj = connection.query(query, values);

			// The error that occurred
			let queryError: Error | null = null;

			// Add listeners to the query
			queryObj
				.on('error', (err: Error) => {

					// Save the error
					queryError = err;

					// Log the error
					console.error(err);

				})
				// .on('fields', (fields) => {
				// 	// the field packets for the rows to follow
				// })
				.on('result', (row: any) => {

					// Pause the connection
					// connection.pause();

					// Run the handler
					// await handleRow(row);
					handleRow(row);

					// Resume the connection
					// connection.resume();

				})
				.on('end', () => {

					// If there was an error, reject with it
					if (queryError) reject(queryError);
					else resolve();

				});

        });
	}

    /**
     * Gets a table object from the database
     * @param name the name of the table
     */
    public getTable(name: string): Table {
        return new Table(this, name);
    }

}
