import { describe, it, expect, vi } from 'vitest';
import { createStore } from '../src/index';


describe('statekit-lite', () => {
    it('get/set basic', () => {
        const state = createStore({ count: 0 });

        expect(state.count.get()).toBe(0);
        state.count.set(5);
        expect(state.count.get()).toBe(5);
    });

    it('set with draft (immer)', () => {
        const state = createStore({
            name: 'Anna', 
            age: 20 
        });

        state.set((draft) => {
            draft.age += 1;

            return draft;
        });

        expect(state.age.get()).toBe(21);
    });

    it('get with clone returns safe copy', () => {
        const state = createStore({ arr: [{ x: 1 }] });
        const original = state.arr.get();
        const clone = state.arr.get(true);

        expect(clone).toEqual(original);
        expect(clone).not.toBe(original);
    });

    it('export returns deep copy without breaking functions', () => {
        const fn = () => { };
        const state = createStore({ render: fn });

        const copy = state.export();
        expect(copy.render).toBe(fn);
    });

    it('watch calls callback on change', () => {
        const state = createStore({ value: 1 });
        const spy = vi.fn();

        const unsub = state.value.watch(spy);
        state.value.set(2);
        expect(spy).toHaveBeenCalledWith(2);

        unsub();
        state.value.set(3);
        expect(spy).toHaveBeenCalledTimes(1);
    });
});