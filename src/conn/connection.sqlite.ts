import { Table } from '../table/table';
import { IConnection } from './connection';
import sqlite3 from 'sqlite3';

export class SqliteConnection implements IConnection {

    /**
     * Creates a SQLite connection instance
     * @param filename the filename to open, or ':memory:' to create an in-memory database
     */
    public constructor(
        private filename: string) {}
        
    /**
     * The cached database connection
     */
    private db: sqlite3.Database | null = null;

    /**
     * Gets the cached connection instance, optionally creating it if needed
     */
	private getConnection(): sqlite3.Database {

        // If there is no connection, create it
        if (!this.db) this.db = new sqlite3.Database(this.filename);

        // Return the database instance
        return this.db;

	}

    /**
     * Runs a query on the database and returns a promise to the results
     * @param query the query string to execute
     * @param values the values to insert to the query
     */
    public query(query: string, values?: any): Promise<any> {
        return new Promise<any>((resolve, reject) => {

			// Get the database connection
			const connection: sqlite3.Database = this.getConnection();

			// Run the query on the database
			connection.all(query, values ?? [], (error: Error, rows: any[]) => {

                // If there was an error
                if (error) {

                    // Log the error
                    console.error(error);

                    // Reject with the error
                    return reject(error);

				}

                // Resolve the results
                resolve(rows);

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
	public async stream(query: string, values: any, handleRow: ((row: any) => void | Promise<void>)): Promise<void> {

		// For now, we simulate streaming. Call the other query method
		const rows: any[] = await this.query(query, values);

		// Call the handler for each one
		for (let row of rows) await handleRow(row);

	}

    /**
     * Gets a table object from the database
     * @param name the name of the table
     */
    public getTable(name: string): Table {
        return new Table(this, name);
    }

}
