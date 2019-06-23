# Using `DataStorage`


## Prerequisites

This tutorial assumes some arbitrary control class with a display class, an
initializer method, and some methods for saving new data records.

```
class ControlClass {
    constructor() {
        ...
        this.display = new DisplayClass();
        ...
    }

    init() {
        ...
    }

    saveType1() {
        ...
    }
    saveType2() {
        ...
    }

    editType1() {
        ...
    }
    editType2() {
        ...
    }
}
window.controlObj = new ControlClass();
```

Assuming : Later sections further assume that the display class also has an
initializer method, as well as an `activate()` method that populates the display
with data and an `update()` method that re-populates the display with new data
(or the class may simply re-run its `activate()` method instead):

```
DisplayClass#update(newData) {
    constructor() {
        ...
    }

    init() {
        ...
    }

    activate() {
        ...
    }
    update() {
        ...
    }
}
```

## Error handling

`DataStorage` relies heavily on asynchronous functions. Since execution of such
code is deferred, it does not occur within the same scope and `try...catch`
blocks will *not* catch exceptions thrown (unless used with an asynchronous call
that is `await`ed); instead, these exceptions will end up as uncaught errors and
provide little - if any - feedback to the end user.

This creates the need for some global-scoped error handling mechanism:

```
window.onerror = function(er) {...};
/**** OR ****/
window.addEventListener('error', er => {...}, false);
```

Where possible, `async` methods should be `await`ed within other `async`
functions and carried out within a `try...catch` block. As a common example,
consider a generic `main()` function which defines a control object and starts
its initialization. If `main()` itself is defined as `async` - and there isn't
much reason why it can't be - then all initialization errors can be caught and
handled:

```
async function main() {
    window.control = new ControlClass();

    try {
        await window.control.init();
    }
    catch(er) {
        console.error(er);
    }
}
```


## Define data classes as extensions of `DSDataRecord`

All data types/classes managed by `DataStorage` **must** extend `DSDataRecord`

```
class DataClass1 extends DSDataRecord {
    ...
}
class DataClass2 extends DSDataRecord {
    ...
}
```


## Define `DataStorage` instance

Constructor requires `string: key` and `DSDataRecordClass[]: types` arguments.

```
ControlClass.constructor() {
    ...
    this.data = new DataStorage('app-name', [DataClass1, DataClass2]);
    ...
}
```


## Initialize the `DataStorage` instance

...preferrably earlier than later as `DataStorage#init()` is asynchronous.

| `DataStorage#init()` will be revised to return *without* `await`ing sync(). A
| separate pipeline will need to be set up to intercept the event where a final
| sync fails.
|
| The remote request & concluding sync can be stored on the object returned by
| these methods. This will allow further checks on their results to be carried
| out in a context-specific manner. See draft typedef of `DSDataActivityResult`.

```
async ControlClass#init() {
    let data = this.data.init();
    let display = this.display.init();
    [data, display] = await Promise.all([data, display]);

    this.display.activate();
}
```


## Manipulating data

| As with `DataStorage#init()`, `DataStorage#save()`, `DataStorage#edit()`, and
| `DataStorage#delete()` will be revised to return *without* `await`ing sync().
| The return value will be changed to some indication of the success of the
| write operation. Again, a separate pipeline will need to be set up to
| intercept the event where a concluding sync fails.


### Saving new data

Saving a new data record is as simple as passing the (single) data instance to
`DataStorage#save()`:

```
ControlClass#saveType1(t1) {
    this.data.save(t1);
    this.display.update(t1);
}
```


### Modifying existing data

Modifying and existing data record is equally as simple using
`DataStorage#edit()`:

```
ControlClass#editType1(t1) {
    this.data.edit(t1);
    this.display.update(t1);
}
```


## Verifying results

In the previous examples the control class simply assumes the success of the
local write operations, as it does not `await` their results for verification.
However, if it is critical for the display to match local storage or if, for
some reason, errors are anticipated, it is possible to check the result of the
write operation(s) before continuing.

```
async ControlClass#saveType2(t2) {
    let saveResult = await this.data.save(t2);

    //  Check the result of the local write operation
    if(!saveResult.prelim)
        ...do something...
    if(!saveResult.local)
        ...do something...

    //  Check the result of the remote write operation
    saveResult.remote = await saveResult.remote;
    if(!saveResult.remote)
        ...do something...

    //  Check the result of the concluding sync
    saveResult.final = await saveResult.final;
    if(!saveResult.final);
        ...do something...

    this.display.update(t2);
}
```

The same strategy can be used to check results of `DataStorage#edit()` and
`DataStorage#delete()`.
