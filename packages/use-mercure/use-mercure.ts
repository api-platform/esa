/// <reference types="urlpattern-polyfill" />
import useSWR from 'swr'
import type { SWRConfiguration } from 'swr'

export type fetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
export type Fetcher = (...args: any[]) => Promise<any>

export default function useMercure(url: string, pattern: URLPattern, fetcher: Fetcher, config: SWRConfiguration = {}) {
    if (!fetcher) {
      fetcher = (input: RequestInfo | URL, init?: RequestInit) => fetch(input, init).then(res => res.json())
    }

    let cb: any = undefined
    const ldFetcher = (...args: any[]) => fetcher(...args)
    .then((data: any) => {
      return ld(
        data, 
        pattern, 
        (root: any) => {
          cb && cb(root, {optimisticData: root, revalidate: false})
        },
        { fetchFn: fetcher as fetchFn}
      )
    })

    const res = useSWR(
      url,
      ldFetcher,
      config
    );

    cb = res.mutate
    return res
}
