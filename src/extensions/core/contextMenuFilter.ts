import { LGraphCanvas, LiteGraph } from '@comfyorg/litegraph'

import { app } from '../../scripts/app'

// Adds filtering to combo context menus

const ext = {
  name: 'Comfy.ContextMenuFilter',
  init() {
    const ctxMenu = LiteGraph.ContextMenu

    // @ts-expect-error TODO Very hacky way to modify Litegraph behaviour. Fix ctx later.
    LiteGraph.ContextMenu = function (values, options) {
      const ctx = new ctxMenu(values, options)

      // If we are a dark menu (only used for combo boxes) then add a filter input
      if (options?.className === 'dark' && values?.length > 4) {
        const filter = document.createElement('input')
        filter.classList.add('comfy-context-menu-filter')
        filter.placeholder = 'Filter list'

        ctx.root.prepend(filter)

        const items = Array.from(
          ctx.root.querySelectorAll('.litemenu-entry')
        ) as HTMLElement[]
        let displayedItems = [...items]
        let itemCount = displayedItems.length

        // We must request an animation frame for the current node of the active canvas to update.
        requestAnimationFrame(() => {
          const currentNode = LGraphCanvas.active_canvas.current_node
          const clickedComboValue = currentNode?.widgets
            ?.filter(
              (w) =>
                w.type === 'combo' && w.options.values?.length === values.length
            )
            .find((w) =>
              // @ts-ignore Poorly typed; filter above "should" mitigate exceptions
              w.options.values?.every((v, i) => v === values[i])
            )?.value

          let selectedIndex = clickedComboValue
            ? values.findIndex((v: string) => v === clickedComboValue)
            : 0
          if (selectedIndex < 0) {
            selectedIndex = 0
          }
          let selectedItem = displayedItems[selectedIndex]
          updateSelected()

          // Apply highlighting to the selected item
          function updateSelected() {
            selectedItem?.style.setProperty('background-color', '')
            selectedItem?.style.setProperty('color', '')
            selectedItem = displayedItems[selectedIndex]
            selectedItem?.style.setProperty(
              'background-color',
              '#ccc',
              'important'
            )
            selectedItem?.style.setProperty('color', '#000', 'important')
          }

          const positionList = () => {
            const rect = ctx.root.getBoundingClientRect()

            // If the top is off-screen then shift the element with scaling applied
            if (rect.top < 0) {
              const scale =
                1 -
                ctx.root.getBoundingClientRect().height / ctx.root.clientHeight

              const shift = (ctx.root.clientHeight * scale) / 2

              ctx.root.style.top = -shift + 'px'
            }
          }

          // Arrow up/down to select items
          filter.addEventListener('keydown', (event) => {
            switch (event.key) {
              case 'ArrowUp':
                event.preventDefault()
                if (selectedIndex === 0) {
                  selectedIndex = itemCount - 1
                } else {
                  selectedIndex--
                }
                updateSelected()
                break
              case 'ArrowRight':
                event.preventDefault()
                selectedIndex = itemCount - 1
                updateSelected()
                break
              case 'ArrowDown':
                event.preventDefault()
                if (selectedIndex === itemCount - 1) {
                  selectedIndex = 0
                } else {
                  selectedIndex++
                }
                updateSelected()
                break
              case 'ArrowLeft':
                event.preventDefault()
                selectedIndex = 0
                updateSelected()
                break
              case 'Enter':
                selectedItem?.click()
                break
              case 'Escape':
                ctx.close()
                break
            }
          })

          filter.addEventListener('input', () => {
            // Hide all items that don't match our filter
            const term = filter.value.toLocaleLowerCase()
            // When filtering, recompute which items are visible for arrow up/down and maintain selection.
            displayedItems = items.filter((item) => {
              const isVisible =
                !term || item.textContent?.toLocaleLowerCase().includes(term)
              item.style.display = isVisible ? 'block' : 'none'
              return isVisible
            })

            selectedIndex = 0
            if (displayedItems.includes(selectedItem)) {
              selectedIndex = displayedItems.findIndex(
                (d) => d === selectedItem
              )
            }
            itemCount = displayedItems.length

            updateSelected()

            // If we have an event then we can try and position the list under the source
            if (options.event) {
              let top = options.event.clientY - 10

              const bodyRect = document.body.getBoundingClientRect()

              const rootRect = ctx.root.getBoundingClientRect()
              if (
                bodyRect.height &&
                top > bodyRect.height - rootRect.height - 10
              ) {
                top = Math.max(0, bodyRect.height - rootRect.height - 10)
              }

              ctx.root.style.top = top + 'px'
              positionList()
            }
          })

          requestAnimationFrame(() => {
            // Focus the filter box when opening
            filter.focus()

            positionList()
          })
        })
      }

      return ctx
    }

    LiteGraph.ContextMenu.prototype = ctxMenu.prototype
  }
}

app.registerExtension(ext)
