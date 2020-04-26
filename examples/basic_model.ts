import { ModelClass, Model, MysqlConnection, Query } from '../src';
import { IConnection } from '../src/conn/connection';

// Connect to the database
const connection: IConnection = new MysqlConnection({
    hostname: '127.0.0.1',
    user: 'root',
    password: '%rt4A%i#Zh%L2S:z2G',
    database: 'delta-prod'
});

class AccountQuery extends Query<Account> {

    public whereAdult(isAdult: boolean = true): this {
        return this
            .if(isAdult).where('age').isGreaterThanOrEqualTo(18)
            .if(!isAdult).where('age').isLessThan(18);
    }

}

@ModelClass({
    table: connection.getTable('accounts'),
    queryClass: AccountQuery
})
export class Account extends Model {

    public getName(): Promise<string> { return this.get<string>('name'); }
    public setName(name: string): void { this.set('name', name); }

}

(async () => {

    // Fetch an account by identifier
    const acct: Account = await Account
        // .findById<AccountQuery>(10)
        // .whereAdult()
        .findOne()
        .exec();

    // Fetch an account by name
    console.log(await acct.getName());

})()
.catch(console.error);
