interface Pose {
  id: number
  name: string
  x: number | null
  y: number | null
  heading: number | null
  radius: number
  arcPose: boolean
  local: boolean
  color:string
  open:string
  
}

//this interface is for calculating the bspline, 
// so it doesn't need the other things for poses which will just be plugged into the b spline
interface Vector{
  x:number 
  y:number 
}

interface poseShape{
  poseId:number
  x:number
  y:number
  radius:number
  color:string
}

interface Shape{
  id:number
  type: "native" | "pose" | "arc" | "none"
  coords:Vector
  color:string
  coords2?:Vector // coords2 will be used if there is an arcpose, coords is left and coords2 is right
  currentArc?: "left" | "right" | "none"
}