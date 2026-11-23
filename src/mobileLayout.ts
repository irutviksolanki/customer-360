/** The root owns the top inset; the mobile dock owns the bottom inset once. */
export function mobileDockLayout(bottomInset:number){
 // Keep the controls visibly above the home indicator. Some simulator/device
 // combinations report a small or zero inset even though the gesture area is
 // still visually occupied, so reserve a modest cushion in addition to it.
 const bottomPadding=Math.max(20,bottomInset+8);
 const height=1+12+48+bottomPadding;
 // Content needs a larger clearance than the dock's own padding because the
 // dock is absolutely positioned over the scroll view.
 return {bottomPadding,height,contentBottom:height+72,toastBottom:height+20};
}
