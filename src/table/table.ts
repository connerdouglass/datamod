import { IConnection } from '../conn/connection';

export class Table {

    /**
     * Constructs a database table instance
     * @param connection the connection to the database
     * @param tableName the name of the table
     */
    public constructor(
        private connection: IConnection,
        private tableName: string) {}

    /**
     * Gets the name of the table
     */
    public getTableName(): string {
        return this.tableName;
    }

    /**
     * Gets the connection to the database
     */
    public getConnection(): IConnection {
        return this.connection;
    }

}
