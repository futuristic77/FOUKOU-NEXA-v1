'use client'

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'

const LOCAL_TEST_PREFIX = 'foukou-nexa:local-test:'

type LocalTestState<T> = {
  value: T
  setValue: Dispatch<SetStateAction<T>>
  ready: boolean
  error: boolean
}

export function useLocalTestState<T>(key: string, initialValue: T): LocalTestState<T> {
  const storageKey = LOCAL_TEST_PREFIX + key + ':v1'
  const [value, setValue] = useState<T>(initialValue)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    try {
      const saved = window.localStorage.getItem(storageKey)
      if (saved !== null && active) setValue(JSON.parse(saved) as T)
    } catch {
      if (active) setError(true)
    } finally {
      if (active) setReady(true)
    }
    return () => {
      active = false
    }
  }, [storageKey])

  useEffect(() => {
    if (!ready || error) return
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value))
    } catch {
      setError(true)
    }
  }, [error, ready, storageKey, value])

  return { value, setValue, ready, error }
}

export function clearLocalTestData(): boolean {
  try {
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index)
      if (key?.startsWith(LOCAL_TEST_PREFIX)) window.localStorage.removeItem(key)
    }
    return true
  } catch {
    return false
  }
}
