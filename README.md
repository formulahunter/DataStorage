# DataStorage

> *The `DataStorage` module provides a simple, abstract interface to a robust
> hybrid local-remote data storage protocol. It can be easily implemented in any
> application that handles data over multiple sessions, subject to some basic
> infrastructure prerequisites.*


[TOC]: ### "Contents"

### Contents
1. [Overview](#overview)
    1. [Features](#features)
    2. [Public API](#public-api)
2. [Backend API](#backend-api)
    1. [Features](#spec)


# Overview

The `DataStorage` API was originally meant to simplify client-side user data
management by automating **HTTP** requests for saving data on a remote server;
since then its scope has grown to include a handful of additional features
including offline data access and synchronization between multiple devices.


### Features

Operation of the module is characterized by the following
qualities:

* *Speed*: Page load times are minimized by relying primarily on local data
  storage and evaluating remote sync result only once they are available.
* *Security*: Data exposure is mitigated by encrypting data in local storage and
  comparing remote repositories using cryptographic hash digests; data is
  transferred in incremental operations to expose only what is strictly
  necessary, and network connections are encrypted.
* *Minimal data transfer*: Cryptographic hash functions allow synchronization of
  large amounts of data using a very small network footprint.
* *Multi-device access*: By periodically synchronizing with a centralized
  server, peripheral client devices are also indirectly synchronized with one
  another.
* *Data backup*: With data saved on multiple devices, any copy can be used to
  restore another in the event of unforeseeable damage, loss or theft.


### Public API

* *search*
* *save*
* *edit*
* *delete*


## Backend API

The client module requires that a server-side API be exposed to interface with
the file system. Implementation of this backend is highly dependent on the
production environment and, as of v0.0.1, so is not included in this package.
Samples used for development may be added to the package in the near future --
please get in touch if this would be helpful.


### Spec

As of v0.0.1, all of the server's public endpoints can accept **HTTP** requests
with the **POST** method; additionally, a single endpoint, the `hash` query (see
below) is exposed to **GET** requests. **POST** requests must be populated with
a **JSON** object with a `query` property, whose value is one of the string
values listed below, and an optional `data` property, whose value (if defined)
depends on which `query` is requested. As implemented, requests are made to
`query.php`. The possible `query` strings are:

* `hash` - responds with the hash digest of the server's data file
* `save` - saves a *new* data record
* `edit` - updates an *existing* data record
* `delete` - marks an *existing* data record as deleted
* `reconcile` - identifies trivial discrepancies and determines the "correct"
    value; if discrepancies cannot be automatically reconciles, they are
    considered "conflicts" and complete details are included in the response for
    manual resolution by the client
* `resolve` - relays the results of manual conflict resolution to the server for
    overwriting the conflicted data file
