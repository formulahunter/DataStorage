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


# Overview


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
