/// <reference types="urlpattern-polyfill" />
import ld, { LdOptions } from '@api-platform/ld';
import useSWR from 'swr'
import type { SWRConfiguration } from 'swr'

export type fetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
export type Fetcher = (...args: any[]) => Promise<any>

export default function useSWRLd<T extends Object>(url: string, fetcher: Fetcher, config: Partial<LdOptions<T>>&SWRConfiguration = {}) {
    let cb: any = undefined

    const res = useSWR(
      url,
      (url: RequestInfo | URL, opts: RequestInit) => 
        ld(url, {
          ...opts, 
          fetchFn: fetcher, 
          urlPattern: config.urlPattern,
          onUpdate: (root) => cb && cb(root, {optimisticData: root, revalidate: false}),
          relativeURIs: config.relativeURIs,
          onError: config.onError,
        }),
      config
    );

    cb = res.mutate
    return res
}
