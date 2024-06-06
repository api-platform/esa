# Edge Side APIs White Paper (Draft)

Edge Side APIs (ESA) is an architecture pattern that allows the creation of more reliable, more efficient, and less resource-intensive APIs.

https://www.esa.com

## Abstract

Edge Side APIs (ESA) is an architecture pattern, that allows the creation of more reliable, more efficient, and less resource-intensive APIs. This architecture revives the main REST/HATEOAS principles while taking full advantage of the new capabilities provided by the web platform.

ESA promotes a mixed approach, synchronous and asynchronous, which allows a great simplicity of development and use, performances rarely reached, and the possibility for the clients to receive updates of the resource it fetched in real-time. Finally, ESA proposes to build on existing standards to expose documentation allowing the creation of generic clients, capable of discovering the capabilities of the API at runtime.

## Introduction

ESA is an architecture for API development that is performant, scalable and reliable. Resources served by the API can be pre-built, and may be generated and stored at edge (edge computing). These small and atomic JSON documents are ideal to lower the energy comsumption of the bandwith, and maximizes the power of the browser's shared cache. Based on HTTP, ESA embraces REST principles and works on any device or script, older or newer. It also benefits of modern ways to invalidate cached content or to preload data with ease, mitigating the n+1 problem. 
ESA can be written in any language and is at the core of [API Platform](https://api-platform.com).

## Atomic resource

Resources served by the API must be small, atomic documents. The API must not embed related resources but instead expose them through an URL. Big resources should be splitted using one-to-one relations exposed by an URL.
This allows a better browser and share cache hit rate. Clients fetch only what they initially need and update only small chunks of data providing less frequent re-generations or invalidations.
Hypermedia is at the heart of Edge Side APIs, prefer formats like JSON-LD, Hydra, JSON:API.

## Pre-generate

Pre-generate as much API responses as possible. The generated static JSON documents are stored in a Content Delivery Network. On write re-generate (or invalidate) API responses impacted by the change. The code can optionally run at edge improving performance, energy consumption, scalability and reliability

## HTTP

The API must be usable by any client on any device (browsers, curl, raw TCP sockets) using HTTP. Capable clients can leverage optional features such as cache, preloading, HTTP/3 or push, for better performance and UX.
The API works everywhere, from modern browsers with top notch performances to on older devices or scripts. To reduce the digital environmental footprint, we must build fewer devices and use them longer!

## Preload

Initially relations needed can be preloaded using [Preload links](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel/preload), optionally using 103 Early Hints or HTTP/2 Server Push. For this the API must be informed of what relations they need ([Vulcain](https://vulcain.rocks/), [Prefer-Push](https://datatracker.ietf.org/doc/html/draft-pot-prefer-push)). This mitigates the n+1 problem and reduces latencies.

## Push

The API offers subscription to real-time updates. On write, new versions of the resources are pushed (when re-generating or invalidating). To do so use [Mercure](https://mercure.rocks), Server-Sent Events, Websockets or WebSub. Clients are always up to date as user interfaces update in real-time. 
