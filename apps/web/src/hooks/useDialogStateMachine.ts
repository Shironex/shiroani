import { useState, useCallback, useRef } from 'react';

type StepState<TSteps extends string> = { step: TSteps } & Record<string, unknown>;

export function useDialogStateMachine<TState extends StepState<string>>(
  initialState: TState & { step: TState['step'] }
) {
  const [state, setState] = useState<TState>(initialState);

  // Callers pass an inline literal recreated every render, so closing over
  // `initialState` directly would re-create `reset` each render (defeating the
  // memo and busting downstream useCallback deps). Capture the first value in a
  // ref so `reset` is stable and always resets to the true initial state.
  const initialStateRef = useRef(initialState);

  const transition = useCallback((next: TState) => {
    setState(next);
  }, []);

  const reset = useCallback(() => {
    setState(initialStateRef.current);
  }, []);

  const updateState = useCallback((updater: (prev: TState) => TState) => {
    setState(updater);
  }, []);

  return { state, transition, reset, updateState } as const;
}
