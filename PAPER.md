Edge Side APIs White Paper (Draft)

Edge Side APIs (ESA) is an architecture pattern that allows the creation of more reliable, more efficient, and less resource-intensive APIs.

https://www.esa.com

Abstract

Edge Side APIs (ESA) is an architecture pattern, that allows the creation of more reliable, more efficient, and less resource-intensive APIs. This architecture revives the main REST/HATEOAS principles while taking full advantage of the new capabilities provided by the web platform.

ESA promotes a mixed approach, synchronous and asynchronous, which allows a great simplicity of development and use, performances rarely reached, and the possibility for the clients to receive updates of the resource it fetched in real-time. Finally, ESA proposes to build on existing standards to expose documentation allowing the creation of generic clients, capable of discovering the capabilities of the API at runtime.

    Introduction

ESA is an architecture for API development that is performant, scalable and reliable. Resources served by the API can be pre-built, and may be generated and stored at edge (edge computing). These small and atomic JSON documents are ideal to lower the energy comsumption of the bandwith, and maximizes the power of the browser's shared cache. Based on HTTP, ESA embraces REST principles and works on any device or script, older or newer. It also benefits of modern ways to invalidate cached content or to preload data with ease, mitigating the n+1 problem.
ESA can be written in any language and is at the core of [API Platform](https://api-platform.com).

    Pre-generate

The generated static JSON documents are stored in a Content Delivery Network. 
Pre-generate as much API responses as possible
➔ Store the API responses in a CDN
➔ On write, re-generate (or invalidate)
all the API responses impacted by the change
➔ Optional: run code at edge
Benefits
➔ Performance
➔ Scalability and reliability
➔ Less energy consumption

    Atomic resource

 Serve small, atomic documents
➔ Don’t embed related resources,
link them (hypermedia)
➔ Split big resources using one-to-one relations
Benefits
➔ Developer Experience: simpler (no
serialization groups…)
➔ Better browser and share cache hit rate
➔ Clients fetch only what they need initially
➔ Relations fetching can be delayed (on click…)
➔ Less frequent re-generations / invalidations

    HTTP

The API must be usable by any client on any device
(think curl + jq or raw TCP sockets)
➔ Capable clients can leverage optional features such
as cache, preloading, HTTP/3 or push, for better
performance and UX
Benefits
➔ Works everywhere, even on old devices, in scripts…
➔ Top notch UX and perf with modern browsers/devices
Reminder: to reduce the digital environmental footprint,
we must build fewer devices and use them longer!

    Preload

 initially relations needed
➔ Use Preload links
(optionally with 103 Early Hints)...
➔ ...or HTTP/2 Server Push
➔ Allow clients informing the API of what
relations they need: Vulcain, Prefer-Push
Benefits
➔ Mitigate the n+1 problem
➔ Reduced latencies

    Push
➔ Clients can subscribe to real-time updates
➔ On write, new versions of the resources are
pushed (do it when re-generating)
➔ Use Mercure, SSE, Websockets and/or
WebSub
Benefits
➔ Clients are always up to date
➔ UX: user interfaces update in real-time
➔ Less energy consumption: no polling
Hypermedia

JSON-LD, Hydra, json:api, json schema

    Technologies

Vulcain, swr, mercure
