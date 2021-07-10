import { createMachine, guards, preserve } from "@chakra-ui/machine"
import { addEventListener, nextTick, noop, Range } from "@chakra-ui/utilities"
import { getElements } from "./number-input.dom"
import { sanitize } from "./number-input.utils"

const { not, and } = guards

export type NumberInputMachineContext = {
  uid: string | number
  doc?: Document
  disabled?: boolean
  readonly?: boolean
  precision?: number
  value: string
  min: number
  max: number
  step: number
  allowMouseWheel?: boolean
  keepWithinRange?: boolean
  clampValueOnBlur?: boolean
  focusInputOnChange?: boolean
}

export type NumberInputMachineState = {
  value: "idle" | "spinUp" | "spinDown" | "decrementing" | "incrementing"
}

export const numberInputMachine = createMachine<
  NumberInputMachineContext,
  NumberInputMachineState
>(
  {
    id: "number-input",
    initial: "idle",
    context: {
      uid: "test-id",
      value: "",
      step: 1,
      min: Number.MIN_SAFE_INTEGER,
      max: Number.MAX_SAFE_INTEGER,
      allowMouseWheel: true,
    },
    on: {
      MOUNT: {
        actions: ["setId", "setOwnerDocument"],
      },
    },
    states: {
      idle: {
        activities: "attachWheelListener",
        on: {
          INC: {
            actions: "incrementBy",
          },
          DEC: {
            actions: "decrementBy",
          },
          GO_TO_MAX: {
            actions: "setToMax",
          },
          GO_TO_MIN: {
            actions: "setToMin",
          },
          PRESS_DOWN_INC: {
            cond: not("isAtMax"),
            target: "incrementing",
            actions: "focusInput",
          },
          PRESS_DOWN_DEC: {
            cond: not("isAtMin"),
            target: "decrementing",
            actions: "focusInput",
          },
          INPUT_CHANGE: {
            actions: "setValue",
          },
          INPUT_BLUR: {
            cond: and("shouldClampOnBlur", not("isInRange")),
            actions: "clampValue",
          },
        },
      },
      spinUp: {
        every: { CHANGE_INTERVAL: "increment" },
        on: {
          PRESS_UP_INC: "idle",
        },
      },
      spinDown: {
        every: { CHANGE_INTERVAL: "decrement" },
        on: {
          PRESS_UP_DEC: "idle",
        },
      },
      incrementing: {
        entry: "increment",
        after: {
          CHANGE_DELAY: {
            target: "spinUp",
            cond: "isInRange",
          },
        },
        on: {
          PRESS_UP_INC: "idle",
        },
      },
      decrementing: {
        entry: "decrement",
        after: {
          CHANGE_DELAY: {
            target: "spinDown",
            cond: "isInRange",
          },
        },
        on: {
          PRESS_UP_DEC: "idle",
        },
      },
    },
  },
  {
    delays: {
      CHANGE_INTERVAL: 50,
      CHANGE_DELAY: 300,
    },
    guards: {
      shouldClampOnBlur: (ctx) => !!ctx.clampValueOnBlur,
      isAtMin: (ctx) => new Range(ctx).isAtMin,
      isAtMax: (ctx) => new Range(ctx).isAtMax,
      isInRange: (ctx) => new Range(ctx).isInRange,
    },
    activities: {
      attachWheelListener(ctx) {
        const doc = ctx.doc ?? document
        const { input } = getElements(ctx)

        if (!input) return noop

        const listener = (event: WheelEvent) => {
          const isInputFocused = doc.activeElement === input
          if (!ctx.allowMouseWheel || !isInputFocused) return noop
          event.preventDefault()

          const dir = Math.sign(event.deltaY) * -1

          if (dir === 1) {
            ctx.value = new Range(ctx).increment().clamp().toString()
          } else if (dir === -1) {
            ctx.value = new Range(ctx).decrement().clamp().toString()
          }
        }
        return addEventListener(input, "wheel", listener, { passive: false })
      },
    },
    actions: {
      setId: (ctx, evt) => {
        ctx.uid = evt.id
      },
      setOwnerDocument(ctx, evt) {
        ctx.doc = preserve(evt.doc)
      },
      focusInput(ctx) {
        const { input } = getElements(ctx)
        nextTick(() => input?.focus())
      },
      increment(ctx) {
        ctx.value = new Range(ctx).increment().clamp().toString()
      },
      decrement(ctx) {
        ctx.value = new Range(ctx).decrement().clamp().toString()
      },
      clampValue(ctx) {
        ctx.value = new Range(ctx).clamp().toString()
      },
      setValue(ctx, event) {
        ctx.value = sanitize(event.value)
      },
      setToMax(ctx) {
        ctx.value = ctx.max.toString()
      },
      setToMin(ctx) {
        ctx.value = ctx.min.toString()
      },
      incrementBy(ctx, evt) {
        ctx.value = new Range(ctx).increment(evt.step).clamp().toString()
      },
      decrementBy(ctx, evt) {
        ctx.value = new Range(ctx).decrement(evt.step).clamp().toString()
      },
    },
  },
)