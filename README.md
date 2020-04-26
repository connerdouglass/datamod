# Datamod
Datamod is a powerful ORM for SQL-based databases. Currently, MySQL is supported, but SQLite support is coming soon.

Datamod has been used in production on very large projects in the television and digital media industry. It's been plucked out of the mono-repo where it used to live, and moved here to NPM and Github as a standalone project.

When you use Datamod, you get these great features built-in:
- Class-based models for tables and objects
- Custom query classes and functions
- Foreign key object references
- Subqueries
- Serialization to JSON
- Connection pools
- Asynchronous everything

Because this project was just moved from our mono-repository, we are working on merging the associated unit tests to this project. They will be up soon and you'll be able to check the status on GitHub once that happens. Thanks!

Below are a few code examples:

### Example #1 - Fetching accounts from database

```typescript
import { ModelClass, Model, MysqlConnection } from 'datamod';

// Connect to the database
const connection = new MysqlConnection({
    hostname: '127.0.0.1',
    user: 'root',
    password: 'pass',
    database: 'my-database'
});

@ModelClass({
    table: connection.getTable('accounts')
})
export class Account extends Model {

    // Add getters / setters like this
    public getName(): Promise<string> {
        return this.get<string>('name');
    }
    public setName(name: string): void {
        this.set('name', name);
    }

}

// Fetch an account by name
const acct: Account = await Account
    .findOne()
    .where('name').isLike('Steve Jobs')
    .exec();
```

### Example #2 - Storing accounts into database

The below example assumes you have a class called "Account" like in the first example above.

```typescript
// Create accounts like this
const account: Account = new Account();

// Set some values onto the object
account.setName('Johnny Appleseed');

// Save the account into the database
await account.save();
```

### Example #3 - Custom Query classes

When querying your database to fetch data from it, Datamod offers a great solution to create functions of common, re-used behavior.

To get started, we create a class of our own, called `AccountQuery` as a subclass of Datamod's built-in `Query<T>` class (where `T` will be the object type being queried on, `Account`). Then, we add functions to the `AccountQuery` class which provide shortcuts to specific SQL query logic:

```typescript
class AccountQuery extends Query<Account> {

    // Returns `this` to support chaining
    public whereTall(): this {
        return this.where('height_inches').isGreaterThanOrEqualTo(72);
    }

}
```

Then, you can use this query by passing it into the `@ModelClass` decorator on the `Account` class, like so:

```typescript
@ModelClass({
    table: /* ... */,
    queryClass: AccountQuery
})
class Account extends Model { /* ... */ }
```

And lastly, you pass the class name `AccountQuery` to the optional generic on any of the standard query functions, like below:

```typescript
const tall_accounts: Account[] = await Account
    .find<AccountQuery>()
    .whereTall()
    .exec();
```

You can even add parameters to make these custom query functions more dynamic. For instance, the `whereTall` could optionally take a boolean value, which can select for tall people, or not-tall people:

```typescript
public whereTall(tall: boolean = true): this {
    return this
        .if(tall).where('height_inches').isGreaterThanOrEqualTo(72)
        .if(!tall).where('height_inches').isLessThan(72);
}
```

Among the benefits of this approach is that it improves your ability to encapsulate implementation details. Users of query classes don't need to know the names of columns. You can define behaviors and traits in your query classes, and hide the specifics from the user.

## Subqueries

Subqueries are a powerful way to select data based on relationships that exist between multiple tables. For example, below is an example which selects all people who own a dog:

```typescript
const dog_owners = await Account
    .find()
    .where('id').inSubquery(
        'owner',
        Dog.find()
    )
    .exec();
```

But, you can get much more detailed than just this. For instance, you could find the first 10 tall people who own a husky:

```typescript
const tall_husky_owners = await Account
    .find<AccountQuery>()
    .whereTall()
    .where('id').inSubquery(
        'owner',
        Dog
            .find()
            .where('breed').isLike('husky')
    )
    .limit(10)
    .exec();
```

The complex composition of filters you create in a query like above is rendered into a SQL string and executed with all of the appropriate placeholders.

### Serialization

Serialization is a big topic, and Datamod has a very useful serialization system; however, the documentation is coming soon. Thank you for your patience!

### What about SQL injection?

Datamod entirely protects against SQL injection attacks, as it uses SQL placeholders (`?` character placeholders) instead of string interpolation.

### Looking forward

Here are our goals for near future releases:
- Generify the query generator to support SQLite, PostgreSQL, etc.
- Add support for JOINs, not just subqueries
- Properly document the serialization system
- Support for MongoDB, maybe?

We're looking for help, so if you wish to contribute, please do!
