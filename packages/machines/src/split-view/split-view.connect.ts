import { StateMachine as S } from "@ui-machines/core"
import { defaultPropNormalizer } from "../utils/dom-attr"
import { HTMLProps } from "../utils/types"
import { getElementIds } from "./split-view.dom"
import { SplitViewMachineContext, SplitViewMachineState } from "./split-view.machine"

export function connectSplitviewMachine(
  state: S.State<SplitViewMachineContext, SplitViewMachineState>,
  send: (event: S.Event<S.AnyEventObject>) => void,
  normalize = defaultPropNormalizer,
) {
  const { context: ctx } = state
  const ids = getElementIds(ctx.uid)

  const isHorizontal = ctx.orientation === "horizontal"
  const isEmpty = ctx.value === 0

  return {
    collapse() {
      send("COLLAPSE")
    },

    expand() {
      send("EXPAND")
    },

    rootProps: normalize<HTMLProps>({
      id: ids.root,
      style: {
        display: "flex",
        flex: "1 1 0%",
        height: isHorizontal ? "100%" : "auto",
        width: isHorizontal ? "auto" : "100%",
        flexDirection: isHorizontal ? "row" : "column",
      },
    }),

    secondaryPaneProps: normalize<HTMLProps>({
      id: ids.secondaryPane,
      style: {
        height: isHorizontal ? "100%" : "auto",
        width: isHorizontal ? "auto" : "100%",
        flex: "1 1 0%",
        position: "relative",
      },
    }),

    primaryPaneProps: normalize<HTMLProps>({
      id: ids.primaryPane,
      style: {
        width: `${ctx.value}px`,
        minWidth: `${ctx.min}px`,
        maxWidth: `${ctx.max}px`,
        visibility: "visible",
        flex: "0 0 auto",
        position: "relative",
        userSelect: state.matches("dragging") ? "none" : "auto",
      },
    }),

    toggleButtonProps: normalize<HTMLProps>({
      id: ids.toggleButton,
      "aria-label": isEmpty ? "Expand Primary Pane" : "Collapse Primary Pane",
      onClick() {
        send("TOGGLE_CLICK")
      },
    }),

    splitterProps: normalize<HTMLProps>({
      id: ids.splitter,
      role: "separator",
      tabIndex: 0,
      "aria-valuenow": ctx.value,
      "aria-valuemin": ctx.min,
      "aria-valuemax": ctx.max,
      "aria-orientation": ctx.orientation,
      "aria-labelledby": ids.splitterLabel,
      "aria-controls": ids.primaryPane,
      style: {
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        msUserSelect: "none",
        flex: "0 0 auto",
        cursor: isHorizontal ? "col-resize" : "row-resize",
        minHeight: isHorizontal ? "0px" : undefined,
        minWidth: isHorizontal ? undefined : "0px",
      },
      onPointerDown(event) {
        if (event.button !== 0) return

        event.preventDefault()
        event.stopPropagation()

        send("POINTER_DOWN")
      },
      onPointerOver() {
        send("POINTER_OVER")
      },
      onPointerLeave() {
        send("POINTER_LEAVE")
      },
      onBlur() {
        send("BLUR")
      },
      onFocus() {
        send("FOCUS")
      },
    }),
  }
}