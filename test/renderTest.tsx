import { render, screen } from '@testing-library/react';
import React, { useEffect } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { createStore } from './index';
import { act } from 'react-dom/test-utils';


describe('statekit-lite + React integration', () => {
    it('component re-renders on state change via .use()', () => {
        const state = createStore({ count: 0 });

        const renderSpy = vi.fn();

        function TestComponent() {
            const count = state.count.use();
            renderSpy(count);

            return (<div data - testid="value" > { count } </div>);
        }

        render(<TestComponent />);
        expect(screen.getByTestId('value').textContent).toBe('0');
        expect(renderSpy).toHaveBeenLastCalledWith(0);

        act(() => {
            state.count.set(5);
        });

        expect(screen.getByTestId('value').textContent).toBe('5');
        expect(renderSpy).toHaveBeenLastCalledWith(5);
    });

    it('supports interval updates with React and cleans up', () => {
        vi.useFakeTimers();
        const state = createStore({ ticks: 0 });

        function Ticker() {
            useEffect(() => {
                const i = setInterval(() => {
                    state.ticks.set((t) => t + 1);
                }, 1000);
                return () => clearInterval(i);
            }, []);

            const ticks = state.ticks.use();
            return <div data - testid="ticks" > { ticks } </div>;
        }

        render(<Ticker />);
        expect(screen.getByTestId('ticks').textContent).toBe('0');

        act(() => {
            vi.advanceTimersByTime(3000);
        });

        expect(screen.getByTestId('ticks').textContent).toBe('3');

        vi.useRealTimers();
    });
});