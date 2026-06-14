import type { Canvas as FabricCanvas, FabricObject } from 'fabric'

export function deleteActiveObject(fc: FabricCanvas): boolean {
  const selected = fc.getActiveObject()
  if (!selected) return false
  fc.remove(selected)
  fc.discardActiveObject()
  fc.requestRenderAll()
  return true
}

export async function duplicateObject(
  fc: FabricCanvas,
  object: FabricObject | null = fc.getActiveObject() ?? null,
): Promise<FabricObject | null> {
  if (!object) return null
  const cloned = (await object.clone()) as FabricObject
  cloned.set({
    left: (object.left ?? 0) + 16,
    top: (object.top ?? 0) + 16,
    evented: true,
    selectable: true,
  })
  fc.add(cloned)
  fc.setActiveObject(cloned)
  fc.requestRenderAll()
  fc.fire('object:modified', { target: cloned })
  return cloned
}

export function setObjectLocked(obj: FabricObject, locked: boolean): void {
  obj.set({
    lockMovementX: locked,
    lockMovementY: locked,
    lockScalingX: locked,
    lockScalingY: locked,
    lockRotation: locked,
    hasControls: !locked,
  })
}

export function isObjectLocked(obj: FabricObject): boolean {
  return Boolean(
    obj.lockMovementX &&
      obj.lockMovementY &&
      obj.lockScalingX &&
      obj.lockScalingY &&
      obj.lockRotation,
  )
}

type LayerAction = 'forward' | 'backward' | 'front' | 'back'

export function moveObjectLayer(fc: FabricCanvas, obj: FabricObject, action: LayerAction): void {
  if (action === 'forward') fc.bringObjectForward(obj)
  else if (action === 'backward') fc.sendObjectBackwards(obj)
  else if (action === 'front') fc.bringObjectToFront(obj)
  else fc.sendObjectToBack(obj)
  fc.setActiveObject(obj)
  fc.requestRenderAll()
  fc.fire('object:modified', { target: obj })
}
