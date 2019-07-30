# DataStorage: Vision & Objectives


> *The `DataStorage` module will provide a simple, abstract interface to a
> robust hybrid local-remote data storage protocol. It will be easily
> implemented in any application that handles data over multiple sessions,
> subject to some basic infrastructure prerequisites.*

[TOC]: ### "Contents"

### Contents
1. [Overview](#overview)
    1. [Features](#features)
    2. [Public API](#public-api)


## Overview

The `DataStorage` interface is implemented as a **JavaScript**
class/module[^module] to be `import`ed into a web application. A single
instance[^multi] is meant to be defined as a property of a `control` class
instance (often as `#data` or similar) and provides an API for access elementary
data operations.

### Features

Operation of the module is characterized by the following
qualities:

* <u style="text-decoration:underline">Speed</u>: Page load times are minimized
  by relying primarily on local data storage and evaluating remote sync result
  only once they are available.
* <u style="text-decoration:underline">Security</u>: Data exposure is mitigated
  by encrypting data in local storage and comparing remote repositories using
  cryptographic hash digests; data is transferred in incremental operations to
  expose only what is absolutely necessary, and network connections are
  encrypted.
* <u style="text-decoration:underline">Minimal data transfer</u>: Cryptographic
  hash functions allow synchronization of large amounts of data using a very
  small data footprint.
* <u style="text-decoration:underline">Multi-device access</u>: By periodically
  synchronizing with a centralized server, peripheral client devices are also
  indirectly synchronized with one another.
* <u style="text-decoration:underline">Data backup</u>: With data saved on
  multiple devices (no fewer than two), either copy can be used to restore the
  other in the event of unforeseeable damage, loss or theft.

[^module]: TODO: define `DataStorage` as a **JavaScript** module

[^multi]: TODO: implement compatibility with multiple instances on a single web
          page

[^search-access]: TODO: determine whether `#search()` is public or private and
                  update here as appropriate


### Public API

* *search*[^search-access]
* *save*
* *edit*
* *delete*
