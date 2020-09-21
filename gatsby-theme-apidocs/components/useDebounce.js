import { useEffect, useRef } from 'react';

export const useUpdateEffect = function (effect, deps) {
  const isInitialMount = useRef(true);
  useEffect(isInitialMount.current
    ? function () {
      isInitialMount.current = false;
    }
    : effect, deps);
};

export const useDebounce = function (fn, ms, args) {
  if (ms === void 0) { ms = 0; }
  if (args === void 0) { args = []; }
  useUpdateEffect(function () {
    const handle = setTimeout(fn.bind(null, args), ms);
    return function () {
      // if args change then clear timeout
      clearTimeout(handle);
    };
  }, args);
};
