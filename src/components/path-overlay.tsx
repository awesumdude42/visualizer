'use client';

import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { bsplineClass } from '@/lib/bsplineClass';
import { Settings } from "@/hooks/use-visualizer";
import { Cpu } from "lucide-react";
import PlaybackControls from "./playback-controls";
import { Lerp, VectorLerp } from "@/lib/lerp";

interface PathDrawProps {
  poses: Pose[];
  paths: Path[];
  updatePose: (id: number, updatedFields: Partial<Pose>) => void;
  reRender: boolean
  currentPathIndex: number
  setCurrentPathIndex: Dispatch<SetStateAction<number>>
  deletePose: (id: number) => void
  updateControlPoint: (pathId: number, currentPoints: ControlPoint[], controlPointId: number, updatedFields: Partial<ControlPoint>) => void
  updateNativePoint: (pathId: number, CPID: number, updatedFields: Partial<NativeControlPoint>) => void
  updatePath: (id: number, updatedFields: Partial<Path>) => void
  updateFirstPose: (pathId: number, updatedFields: Partial<NativeControlPoint>) => void
  updateEndPose: (pathId: number, updatedFields: Partial<NativeControlPoint>) => void
  currentShape: Shape
  setCurrentShape: Dispatch<SetStateAction<Shape>>
}

export default function DrawPaths({
  poses,
  paths,
  updatePose,
  reRender,
  setCurrentPathIndex,
  updateControlPoint,
  updateNativePoint,
  updatePath,
  updateFirstPose,
  updateEndPose,
  currentShape,
  setCurrentShape
}: PathDrawProps) {


  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);



  const {
    image
  } = Settings();




  const [imageLoaded, setImageLoaded] = useState(false);







  let startX: number;
  let startY: number;

  let centerX: number;
  let centerY: number;
  let scaleX: number;
  let scaleY: number;



  const currentShapeRef = useRef<Shape>(currentShape)
  let isDraggingShapeRef = useRef<boolean>(false);




  function toPx(p: Vector) {
    return { x: centerX + p.x * scaleX, y: centerY - p.y * scaleY }
  }









  useEffect(() => {


    const shapes: Shape[] = []

    //add poses
    poses.forEach((pose) => {
      shapes.push({
        id: pose.id,
        type: "pose",
        coords: {
          x: pose.x ?? 0,
          y: pose.y ?? 0
        },
        color: pose.color
      })

    })

    const localPoses = poses.map(pose => ({ ...pose }));

    const localPaths = paths.map(path => ({ ...path }));



    //add native control points
    localPaths.forEach((path, index) => {

      const list: ControlPoint[] = [path.firstPose, ...path.controlPoints, path.endPose]
      //first
      if (index == 0) // only adds the first if its the first path, without this, there are some weird errors with drag
        shapes.push({
          id: path.firstPose.id,
          type: "native",
          coords: path.firstPose.nativeParameter?.coord ?? { x: 0, y: 0 },
          color: path.color
        })
      //addable/subtractable
      path.controlPoints.forEach((CP) => {
        const spline = new bsplineClass(path, localPoses)
        if (CP.isNative && CP.nativeParameter)
          shapes.push({
            id: CP.id,
            type: "native",
            coords: CP.nativeParameter.coord,
            color: path.color
          })
        if (CP.nativeParameter?.arcPose) {
          const index = list.findIndex((p) => p.id == CP.id)

          if (index) {
            const arcPoses = spline.getArcPoses(index)
            shapes.push({
              id: CP.id,
              type: "arc",
              coords: arcPoses[0],
              color: "#000000",
              coords2: arcPoses[1]
            })
          }
        } else {
          const pose = localPoses.find((pose) => pose.id == CP.poseId)
          if (pose?.arcPose) {
            const index = list.findIndex((p) => p.id == CP.id)
            if (index) {
              const arcPoses = spline.getArcPoses(index)

              shapes.push({
                id: CP.poseId as number,
                type: "arc",
                coords: arcPoses[0],
                color: "#000000",
                coords2: arcPoses[1]
              })
            }
          }
        }
      })
      //end
      shapes.push({
        id: path.endPose.id,
        type: "native",
        coords: path.endPose.nativeParameter?.coord ?? { x: 0, y: 0 },
        color: path.color
      })
    })











    //drag and drop checker
    let is_mouse_in_shape = (x: number, y: number, shape: Shape) => {
      let tolerance = 10;
      if (shape.type == "native") tolerance = 12;



      if (shape.type == "arc" && shape.coords2) {
        tolerance = 7;
        const left = toPx(shape.coords)
        const right = toPx(shape.coords2)

        const leftDist = (x - left.x) ** 2 + (y - left.y) ** 2
        const rightDist = (x - right.x) ** 2 + (y - right.y) ** 2

        if (leftDist <= 5 ** 2 + tolerance ** 2) { // if in left
          shape.currentArc = "left";
          return true;
        }
        else if (rightDist <= 5 ** 2 + tolerance ** 2) {
          shape.currentArc = "right";
          return true
        }
        else {
          shape.currentArc == "none";
          return false;
        }
      }

      const s = toPx(shape.coords)
      let squaredDist = (x - s.x) ** 2 + (y - s.y) ** 2


      if (shape.type == "pose") return squaredDist <= 7 ** 2 + tolerance ** 2
      else if (shape.type == "native") return squaredDist <= 8 ** 2 + tolerance ** 2
    }



    let is_mouse_in_lerp = (x: number, y: number, lerp: Lerp) => {

      let tolerance = 20;

      const numPoints = Math.abs(lerp.getDistance()) * 50;

      for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        const pt = lerp.evaluate(t);

        let cp = toPx(pt)

        const squaredDist = (x - cp.x) ** 2 + (y - cp.y) ** 2;
        if (squaredDist <= tolerance ** 2) {
          return true;
        }
      }
      return false;
    }


    let is_mouse_in_path = (x: number, y: number, spline: bsplineClass, path: Path) => {
      const numPoints = (path.controlPoints.length + 2) * 200;

      const tolerance = 5;

      for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        const pt = spline.evaluate(t);

        const cp = toPx(pt)
        const squaredDist = (x - cp.x) ** 2 + (y - cp.y) ** 2;
        if (squaredDist <= tolerance ** 2) {
          return true;
        }
      }
      return false;
    }

    let mouse_down = (event: MouseEvent) => {
      event.preventDefault();
      startX = event.clientX - rect.left;
      startY = event.clientY - rect.top;

      let reached = false;

      for (const shape of shapes) {
        if (is_mouse_in_shape(startX, startY, shape) && shape.type != "arc") {
          currentShapeRef.current = shape;
          setCurrentShape({ ...shape, coords: { ...shape.coords } });
          isDraggingShapeRef.current = true;
          reached = true;
          draw();
          break;
        } else {
          //now for arc poses
          if (shape.type == "arc") {
            for (const shape of shapes) {
              if (is_mouse_in_shape(startX, startY, shape)) {
                currentShapeRef.current = shape;
                setCurrentShape({ ...shape, coords: { ...shape.coords } });
                isDraggingShapeRef.current = true;
                reached = true;
                draw();
                break;
              }
            }
          }
        }
      }

      if (!reached) {
        const none: Shape = { id: 0, coords: { x: 0, y: 0 }, color: "", type: "none" };
        currentShapeRef.current = none;
        setCurrentShape(none);
        draw();
      }

      localPaths.forEach((path, i) => {
        if (is_mouse_in_path(startX, startY, new bsplineClass(path, localPoses), path)) {
          setCurrentPathIndex(i);
          reached = true;
        }
      });
    };

    let mouse_up = (event: MouseEvent) => {
      if (isDraggingShapeRef.current) {
        shapes.forEach((shape) => {
          //path stuff
          if (shape.type == "native") {

            localPaths.forEach((path, index) => {
              path.controlPoints.forEach((CP) => {
                if (CP.id == shape.id) {
                  updateNativePoint(path.id, CP.id, {
                    coord: {
                      x: Number(shape.coords.x.toFixed(3)),
                      y: Number(shape.coords.y.toFixed(3)),
                    },
                    radius: Number(CP.nativeParameter?.radius.toFixed(3))
                  })
                }
                if (shape.id == CP.id) setCurrentPathIndex(index)
              })
              if (path.firstPose.id == shape.id) {
                updateFirstPose(path.id, {
                  coord: {
                    x: Number(shape.coords.x.toFixed(3)),
                    y: Number(shape.coords.y.toFixed(3))
                  }
                })
                if (shape.id == path.firstPose.id) setCurrentPathIndex(index)
              }
              if (path.endPose.id == shape.id) {
                updateEndPose(path.id, {
                  coord: {
                    x: Number(shape.coords.x.toFixed(3)),
                    y: Number(shape.coords.y.toFixed(3))
                  }
                })
                if (shape.id == path.endPose.id) setCurrentPathIndex(index)
              }
            })
            //pose stuff
          } else if (shape.type == "pose") {
            const pose = localPoses.find((pose) => pose.id == shape.id)
            if (pose)
              updatePose(shape.id, {
                x: Number(shape.coords.x.toFixed(3)),
                y: Number(shape.coords.y.toFixed(3)),
                radius: Number(pose.radius.toFixed(3))
              })
          }
        })

        isDraggingShapeRef.current = false;
      }
    };


    let mouse_out = (event: MouseEvent) => {

      if (isDraggingShapeRef.current) {
        shapes.forEach((shape) => {
          //path stuff
          if (shape.type == "native") {
            localPaths.forEach((path) => {
              path.controlPoints.forEach((CP) => {
                if (CP.id == shape.id) {
                  (path.id, CP.id, {
                    coord: {
                      x: Number(shape.coords.x.toFixed(3)),
                      y: Number(shape.coords.y.toFixed(3))
                    }
                  })
                }
              })
              if (path.firstPose.id == shape.id) {
                updateFirstPose(path.id, {
                  coord: {
                    x: Number(shape.coords.x.toFixed(3)),
                    y: Number(shape.coords.y.toFixed(3))
                  }
                })
              }
              if (path.endPose.id == shape.id) {
                updateEndPose(path.id, {
                  coord: {
                    x: Number(shape.coords.x.toFixed(3)),
                    y: Number(shape.coords.y.toFixed(3))
                  }
                })
              }
            })
            //pose stuff
          } else if (shape.type == "pose") {
            const pose = localPoses.find((pose) => pose.id == shape.id)
            if (pose)
              updatePose(shape.id, {
                x: Number(shape.coords.x.toFixed(3)),
                y: Number(shape.coords.y.toFixed(3)),
                radius: Number(pose.radius.toFixed(3))
              })
          }
        })
      }


      isDraggingShapeRef.current = false;

    };

    let mouse_move = (event: MouseEvent) => {

      if (ctx && isDraggingShapeRef.current) ctx.globalAlpha = 0.7;

      let mouseX = event.clientX - rect.left;
      let mouseY = event.clientY - rect.top;
      if (isDraggingShapeRef.current) {
        let dx = mouseX - startX;
        let dy = mouseY - startY;


        let coords = currentShapeRef.current.coords;



        if (coords && currentShapeRef.current && currentShapeRef.current.type !== "arc")
          currentShapeRef.current.coords = {
            x: coords.x + dx / scaleX,
            y: coords.y - dy / scaleY,
          };

        if (currentShapeRef.current.type == "native") {
          localPaths.forEach((path) => {

            const spline = new bsplineClass(path, localPoses)
            const list: ControlPoint[] = [path.firstPose, ...path.controlPoints, path.endPose]

            path.controlPoints.forEach((CP, index) => {
              //if it is reg control point,
              if (currentShapeRef.current.id == CP.id && CP.nativeParameter) {
                CP.nativeParameter.coord = {
                  x: coords.x + dx / scaleX,
                  y: coords.y - dy / scaleY
                }

                //if it is an arc pose, edit arc pose values too!
                if (CP.nativeParameter.arcPose) {
                  shapes.forEach((shape) => {
                    if (shape.type == "arc" && shape.id == CP.id && shape.coords2) {
                      const index = list.findIndex((p) => p.id == CP.id)
                      const arcPoses = spline.getArcPoses(index);
                      shape.coords = {
                        x: arcPoses[0].x + dx / scaleX,
                        y: arcPoses[0].y - dy / scaleY
                      }
                      shape.coords2 = {
                        x: arcPoses[1].x + dx / scaleX,
                        y: arcPoses[1].y - dy / scaleY
                      }
                    }
                  })
                }
                //some points influences arposes, so lets add that! documenting my thoughts cus ive tried this multiple times to no success
                //first, we need to figure out which side of the arcpose needs updating

                //so this current could either be on right or left
                if (index == 0 && path.controlPoints.length > 1) {
                  //if its the first pose in the list and there is a pose after it
                  //get the pose to the right
                  const right = path.controlPoints.at(index + 1)
                  if (right?.isNative && right.nativeParameter && right.nativeParameter.arcPose) { // make sure its an arcpose
                    //now loop through shapes
                    shapes.forEach((shape) => {
                      if (shape.type == "arc" && shape.coords2 && shape.id == right.id) {//if its an arc pose with the right id
                        //then, we update the arc pose
                        const index = list.findIndex((p) => p.id == right.id)//get the arcpose index of the right control point
                        const arcPoses = spline.getArcPoses(index);// get arcposes
                        shape.coords = { // edit arcpose location, it is [0] because arc pose is to the left of the actual pose
                          x: arcPoses[0].x + dx / scaleX,
                          y: arcPoses[0].y - dy / scaleY
                        }
                        //AFTER DOCUMENTING TS, IT FINALLY WORKS, THIS IS WHY I HAVE AN ARMADA OF DUCKS NEXT TO MY LAPTOP
                        //now, ima just copy and past this down for the last pose
                      }
                    })
                  } else {
                    if (right) {
                      const pose = localPoses.find((pose) => pose.id == right.poseId)
                      if (pose && pose.arcPose) {
                        shapes.forEach((shape) => {
                          if (shape.type == "arc" && shape.id == pose.id && shape.coords2) {
                            const index = list.findIndex((p) => p.poseId == pose.id)
                            const arcPoses = spline.getArcPoses(index);
                            shape.coords = {
                              x: arcPoses[0].x + dx / scaleX,
                              y: arcPoses[0].y - dy / scaleY
                            }
                          }
                        })
                      }
                    }
                  }
                } else if (index == path.controlPoints.length - 1 && path.controlPoints.length > 1) {
                  const left = path.controlPoints.at(index - 1)
                  if (left?.isNative && left.nativeParameter && left.nativeParameter.arcPose) {
                    shapes.forEach((shape) => {
                      if (shape.type == "arc" && shape.coords2 && shape.id == left.id) {
                        const index = list.findIndex((p) => p.id == left.id)
                        const arcPoses = spline.getArcPoses(index);
                        shape.coords2 = {
                          x: arcPoses[1].x + dx / scaleX,
                          y: arcPoses[1].y - dy / scaleY
                        }
                      }
                    })
                  } else {
                    if (left) {
                      const pose = localPoses.find((pose) => pose.id == left.poseId)
                      if (pose && pose.arcPose) {
                        shapes.forEach((shape) => {
                          if (shape.type == "arc" && shape.id == pose.id && shape.coords2) {
                            const index = list.findIndex((p) => p.poseId == pose.id)
                            const arcPoses = spline.getArcPoses(index);
                            shape.coords2 = {
                              x: arcPoses[1].x + dx / scaleX,
                              y: arcPoses[1].y - dy / scaleY
                            }
                          }
                        })
                      }
                    }
                  }
                } else {
                  //now, here is the most complicated one, cus we needa check left and right
                  const right = path.controlPoints.at(index + 1)
                  const left = path.controlPoints.at(index - 1)
                  //check left
                  if (left && left.isNative && left.nativeParameter && left.nativeParameter.arcPose) {
                    shapes.forEach((shape) => {
                      if (shape.type == "arc" && shape.coords2 && shape.id == left.id) {
                        const index = list.findIndex((p) => p.id == left.id)
                        const arcPoses = spline.getArcPoses(index);
                        shape.coords2 = {
                          x: arcPoses[1].x + dx / scaleX,
                          y: arcPoses[1].y - dy / scaleY
                        }
                      }
                    })
                  } else {
                    if (left) {
                      const pose = localPoses.find((pose) => pose.id == left.poseId)
                      if (pose && pose.arcPose) {
                        shapes.forEach((shape) => {
                          if (shape.type == "arc" && shape.id == pose.id && shape.coords2) {
                            const index = list.findIndex((p) => p.poseId == pose.id)
                            const arcPoses = spline.getArcPoses(index);
                            shape.coords2 = {
                              x: arcPoses[1].x + dx / scaleX,
                              y: arcPoses[1].y - dy / scaleY
                            }
                          }
                        })
                      }
                    }
                  }
                  //check right
                  if (right && right.isNative && right.nativeParameter && right.nativeParameter.arcPose) {
                    shapes.forEach((shape) => {
                      if (shape.type == "arc" && shape.coords2 && shape.id == right.id) {
                        const index = list.findIndex((p) => p.id == right.id)
                        const arcPoses = spline.getArcPoses(index);
                        shape.coords = {
                          x: arcPoses[0].x + dx / scaleX,
                          y: arcPoses[0].y - dy / scaleY
                        }
                      }
                    })
                  } else {
                    if (right) {
                      const pose = localPoses.find((pose) => pose.id == right.poseId)
                      if (pose && pose.arcPose) {
                        shapes.forEach((shape) => {
                          if (shape.type == "arc" && shape.id == pose.id && shape.coords2) {
                            const index = list.findIndex((p) => p.poseId == pose.id)
                            const arcPoses = spline.getArcPoses(index);
                            shape.coords = {
                              x: arcPoses[0].x + dx / scaleX,
                              y: arcPoses[0].y - dy / scaleY
                            }
                          }
                        })
                      }
                    }
                  }
                }
              }
            })


            //now for the EDGE OF EDGE cases! the first and endposes of the path can also influence the control points
            if (path.firstPose.id == currentShapeRef.current.id && path.firstPose.nativeParameter) {
              //seperating it from below if statement for clarity
              if (path.controlPoints.length > 0) {
                const left = path.controlPoints.at(0)
                if (left?.isNative && left.nativeParameter && left.nativeParameter.arcPose) {
                  shapes.forEach((shape) => {
                    if (shape.type == "arc" && shape.coords2 && shape.id == left.id) {
                      const index = list.findIndex((p) => p.id == left.id)
                      const arcPoses = spline.getArcPoses(index);
                      shape.coords = {
                        x: arcPoses[0].x + dx / scaleX,
                        y: arcPoses[0].y - dy / scaleY
                      }
                    }
                  })
                } else {
                  if (left) {
                    const pose = localPoses.find((pose) => pose.id == left.poseId)
                    if (pose && pose.arcPose) {
                      shapes.forEach((shape) => {
                        if (shape.type == "arc" && shape.id == pose.id && shape.coords2) {
                          const index = list.findIndex((p) => p.poseId == pose.id)
                          const arcPoses = spline.getArcPoses(index);
                          shape.coords = {
                            x: arcPoses[0].x + dx / scaleX,
                            y: arcPoses[0].y - dy / scaleY
                          }
                        }
                      })
                    }
                  }
                }
              }
            }
            if (path.endPose.id == currentShapeRef.current.id && path.endPose.nativeParameter) {
              //seperating it from prev thing for clarity
              if (path.controlPoints.length > 0) {
                const right = path.controlPoints.at(-1)
                if (right?.isNative && right.nativeParameter && right.nativeParameter.arcPose) {
                  shapes.forEach((shape) => {
                    if (shape.type == "arc" && shape.coords2 && shape.id == right.id) {
                      const index = list.findIndex((p) => p.id == right.id)
                      const arcPoses = spline.getArcPoses(index);
                      shape.coords2 = {
                        x: arcPoses[1].x + dx / scaleX,
                        y: arcPoses[1].y - dy / scaleY
                      }
                    }
                  })
                } else {
                  if (right) {
                    const pose = localPoses.find((pose) => pose.id == right.poseId)
                    if (pose && pose.arcPose) {
                      shapes.forEach((shape) => {
                        if (shape.type == "arc" && shape.id == pose.id && shape.coords2) {
                          const index = list.findIndex((p) => p.poseId == pose.id)
                          const arcPoses = spline.getArcPoses(index);
                          shape.coords2 = {
                            x: arcPoses[1].x + dx / scaleX,
                            y: arcPoses[1].y - dy / scaleY
                          }
                        }
                      })
                    }
                  }
                }
              }
            }


            if (path.firstPose.id == currentShapeRef.current.id && path.firstPose.nativeParameter) {
              path.firstPose.nativeParameter.coord = {
                x: coords.x + dx / scaleX,
                y: coords.y - dy / scaleY
              }
            }
            if (path.endPose.id == currentShapeRef.current.id && path.endPose.nativeParameter) {
              path.endPose.nativeParameter.coord = {
                x: coords.x + dx / scaleX,
                y: coords.y - dy / scaleY
              }
            }
          })
        } else if (currentShapeRef.current.type == "pose") {
          let activePose = localPoses.find((pose) => pose.id == currentShapeRef.current.id)

          if (activePose) {
            activePose.x = coords.x + dx / scaleX;
            activePose.y = coords.y - dy / scaleY;
          }
          if (activePose?.arcPose) {
            localPaths.forEach((path) => {
              const list: ControlPoint[] = [path.firstPose, ...path.controlPoints, path.endPose]
              path.controlPoints.forEach((CP) => {
                if (!CP.isNative) {
                  const pose = localPoses.find((pose) => pose.id == CP.poseId)
                  if (pose && pose.arcPose) {
                    shapes.forEach((shape) => {
                      if (shape.type == "arc" && shape.id == CP.poseId && shape.coords2) {
                        const index = list.findIndex((p) => p.poseId == CP.poseId)
                        const spline = new bsplineClass(path, localPoses)
                        const arcPoses = spline.getArcPoses(index);
                        shape.coords = {
                          x: arcPoses[0].x + dx / scaleX,
                          y: arcPoses[0].y - dy / scaleY
                        }
                        shape.coords2 = {
                          x: arcPoses[1].x + dx / scaleX,
                          y: arcPoses[1].y - dy / scaleY
                        }
                      }
                    })
                  }
                }
              })
            })
          }
          else {
            //some poses influence arc poses! so, lets do that
            //first, let's figure out our neighbors

            //get control point neighbors
            localPaths.forEach((path) => {
              const list: ControlPoint[] = [path.firstPose, ...path.controlPoints, path.endPose]

              if (activePose) {
                const index = path.controlPoints.findIndex((CP) => CP.poseId == activePose.id)
                const left = path.controlPoints[index - 1]
                const right = path.controlPoints[index + 1]
                //if left is an native arcpose point
                if (left != undefined) {//make sure there is a pose to the left to check
                  if (left.isNative && left.nativeParameter?.arcPose) {
                    shapes.forEach((shape) => {
                      if (shape.id == left.id && shape.coords2 && shape.type == "arc") {
                        const index = list.findIndex((p) => p.id == left.id)
                        const spline = new bsplineClass(path, localPoses)
                        const arcPoses = spline.getArcPoses(index);

                        //this thing is to the left of the pose, so it would be the left one

                        shape.coords2 = {
                          x: arcPoses[1].x + dx / scaleX,
                          y: arcPoses[1].y - dy / scaleY
                        }
                      }
                    })
                  } else {
                    if (left.poseId != null) { // if its a valid pose
                      const leftPose = localPoses.find((pose) => pose.id == left.poseId) // save left pose
                      if (leftPose && leftPose.arcPose) {//check if it is an arc pose
                        shapes.forEach((shape) => {
                          if (shape.id == leftPose.id && shape.coords2 && shape.type == "arc") {// if it is the shape we are looking for
                            const index = list.findIndex((p) => p.poseId == leftPose.id)
                            const spline = new bsplineClass(path, localPoses)
                            const arcPoses = spline.getArcPoses(index);//get arc pose

                            //this thing is to the left of the pose, so it would be the left one

                            shape.coords2 = {
                              x: arcPoses[1].x + dx / scaleX,
                              y: arcPoses[1].y - dy / scaleY
                            }
                          }
                        })
                      }
                    }
                  }
                } else if (right != undefined) {//make sure there is a pose to the right to check
                  if (right.isNative && right.nativeParameter?.arcPose) {
                    shapes.forEach((shape) => {
                      if (shape.id == right.id && shape.coords2 && shape.type == "arc") {
                        const index = list.findIndex((p) => p.id == right.id)
                        const spline = new bsplineClass(path, localPoses)
                        const arcPoses = spline.getArcPoses(index);

                        //this thing is to the right of the pose, so it would be the right one

                        shape.coords = {
                          x: arcPoses[0].x + dx / scaleX,
                          y: arcPoses[0].y - dy / scaleY
                        }
                      }
                    })
                  } else {
                    if (right.poseId != null) { // if its a valid pose
                      const leftPose = localPoses.find((pose) => pose.id == right.poseId) // save right pose
                      if (leftPose && leftPose.arcPose) {//check if it is an arc pose
                        shapes.forEach((shape) => {
                          if (shape.id == leftPose.id && shape.coords2 && shape.type == "arc") {// if it is the shape we are looking for
                            const index = list.findIndex((p) => p.poseId == leftPose.id)
                            const spline = new bsplineClass(path, localPoses)
                            const arcPoses = spline.getArcPoses(index);//get arc pose

                            //this thing is to the right of the pose, so it would be the left one

                            shape.coords = {
                              x: arcPoses[0].x + dx / scaleX,
                              y: arcPoses[0].y - dy / scaleY
                            }
                          }
                        })
                      }
                    }
                  }
                }
              }
            })
          }
        } else if (currentShapeRef.current.type == "arc") {

          //this ENTIRE thing is for native control points, i need to make make it for poses
          localPaths.forEach((path) => {
            //gonna use linear interpolation for this
            const list: ControlPoint[] = [path.firstPose, ...path.controlPoints, path.endPose]




            //alright, now we need to figure out which pose is being moved
            shapes.forEach((shape) => {



              if (shape.type == "arc" && shape.id == currentShapeRef.current.id && shape.coords2) {

                //now, the current Arc shouldve been set
                if (shape.currentArc == "left") {
                  //now that we know that it the left, we can find P2
                  const index = (path.controlPoints.findIndex((CP) => (CP.isNative ? CP.id : CP.poseId) == shape.id))
                  const P1 = path.controlPoints[index]
                  if (P1) {
                    let P2: ControlPoint;
                    if (index == 0) {
                      //only if it is the first control point
                      P2 = path.firstPose;
                    } else {
                      //there has to be more than 1 control point because the end points cant be arc poses
                      const prevCP = path.controlPoints[index - 1]
                      P2 = prevCP


                    }
                    const y = (centerY - mouseY) / scaleY
                    const x = (mouseX - centerX) / scaleX
                    const lerp = new Lerp(P1, P2, localPoses)
                    if (is_mouse_in_lerp(mouseX, mouseY, lerp)) {


                      if (Math.abs(lerp.getSlope()) < 1) {
                        shape.coords = {
                          x: lerp.clampX(x),
                          y: lerp.getY(x)
                        }
                      } else {
                        shape.coords = {
                          x: lerp.getX(y),
                          y: lerp.clampY(y)
                        }
                      }

                      
                      
                      
              
                      let radius = Math.abs(Math.sqrt((lerp.P1.x - shape.coords.x) ** 2 + (lerp.P1.y - shape.coords.y) ** 2))

                      
                      
                      
                      if (radius >= lerp.getDistance()) radius = lerp.getDistance();
                      path.controlPoints.forEach((CP) => {
                        if (CP.isNative && CP.id == currentShapeRef.current.id && CP.nativeParameter && CP.nativeParameter.arcPose) {
                          CP.nativeParameter.radius = Number(radius.toFixed(3));
                        } else if (!CP.isNative && CP.poseId == currentShapeRef.current.id) {
                          const poseIndex = localPoses.findIndex((pose) => pose.id == CP.poseId)
                          const pose = localPoses[poseIndex]
                          if (pose && pose.arcPose) {
                            pose.radius = radius;
                          }
                        }
                      })
                      //now, let's update the arcpose
                      const spline = new bsplineClass(path, localPoses)
                      const index = list.findIndex((CP) => (CP.isNative ? CP.id : CP.poseId) == shape.id)
                      if (index) {
                        const arcPoses = spline.getArcPoses(index);

                        shape.coords2 = arcPoses[1]
                      }

                      //recheck?

                      // now, we just need the arc pose of the other thing :shape.coords2

                      let radiusR = Math.abs(Math.sqrt((lerp.P1.x - shape.coords2.x) ** 2 + (lerp.P1.y - shape.coords2.y) ** 2))

                      //now, these will be the same bc of how i wrote the code(theoretically, if im not a dumbass)

                      
                      radius = Math.min(radius,radiusR)

                      if (radius >= lerp.getDistance()) radius = lerp.getDistance();
                      path.controlPoints.forEach((CP) => {
                        if (CP.isNative && CP.id == currentShapeRef.current.id && CP.nativeParameter && CP.nativeParameter.arcPose) {
                          CP.nativeParameter.radius = Number(radius.toFixed(3));
                        } else if (!CP.isNative && CP.poseId == currentShapeRef.current.id) {
                          const poseIndex = localPoses.findIndex((pose) => pose.id == CP.poseId)
                          const pose = localPoses[poseIndex]
                          if (pose && pose.arcPose) {
                            pose.radius = radius;
                          }
                        }
                      })
                    }
                  }
                } else if (shape.currentArc == "right") {

                  const index = (path.controlPoints.findIndex((CP) => (CP.isNative ? CP.id : CP.poseId) == shape.id))
                  const P1 = path.controlPoints[index]

                  if (P1) {
                    let P2: ControlPoint;
                    if (index == path.controlPoints.length - 1) {
                      P2 = path.endPose;
                    } else {
                      const prevCP = path.controlPoints[index + 1]
                      P2 = prevCP


                    }
                    const y = (centerY - mouseY) / scaleY
                    const x = (mouseX - centerX) / scaleX
                    const lerp = new Lerp(P1, P2, localPoses)
                    if (is_mouse_in_lerp(mouseX, mouseY, lerp)) {
                      if (Math.abs(lerp.getSlope()) < 1) {
                        shape.coords2 = {
                          x: lerp.clampX(x),
                          y: lerp.getY(x)
                        }
                      } else {
                        shape.coords2 = {
                          x: lerp.getX(y),
                          y: lerp.clampY(y)
                        }
                      }
                      let radius = Math.abs(Math.sqrt((lerp.P1.x - shape.coords2.x) ** 2 + (lerp.P1.y - shape.coords2.y) ** 2))
                      if (radius >= lerp.getDistance()) radius = lerp.getDistance();
                      path.controlPoints.forEach((CP) => {
                        if (CP.isNative && CP.id == currentShapeRef.current.id && CP.nativeParameter && CP.nativeParameter.arcPose) {
                          CP.nativeParameter.radius = Number(radius.toFixed(3));
                        } else if (!CP.isNative && CP.poseId == currentShapeRef.current.id) {
                          const poseIndex = localPoses.findIndex((pose) => pose.id == CP.poseId)
                          const pose = localPoses[poseIndex]
                          if (pose && pose.arcPose) {
                            pose.radius = radius;
                          }
                        }
                      })
                      const spline = new bsplineClass(path, localPoses)
                      const index = list.findIndex((CP) => (CP.isNative ? CP.id : CP.poseId) == shape.id)
                      if (index) {
                        const arcPoses = spline.getArcPoses(index);

                        shape.coords = arcPoses[0]
                      }


                      let radiusL = Math.abs(Math.sqrt((lerp.P1.x - shape.coords.x) ** 2 + (lerp.P1.y - shape.coords.y) ** 2))

                      
                      radius = Math.min(radius,radiusL)

                      if (radius >= lerp.getDistance()) radius = lerp.getDistance();
                      path.controlPoints.forEach((CP) => {
                        if (CP.isNative && CP.id == currentShapeRef.current.id && CP.nativeParameter && CP.nativeParameter.arcPose) {
                          CP.nativeParameter.radius = Number(radius.toFixed(3));
                        } else if (!CP.isNative && CP.poseId == currentShapeRef.current.id) {
                          const poseIndex = localPoses.findIndex((pose) => pose.id == CP.poseId)
                          const pose = localPoses[poseIndex]
                          if (pose && pose.arcPose) {
                            pose.radius = radius;
                          }
                        }
                      })
                    }
                  }
                }
              }
            })
          })
        }


        draw();

        startX = mouseX;
        startY = mouseY;
      } else {
        return
      }
    }






    //canvas init
    const canvas = canvasRef.current;
    const img = imageRef.current;

    if (!canvas || !img) return;

    const rect = img.getBoundingClientRect();


    if (rect.width === 0 || rect.height === 0) return;

    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;







    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    canvas.onmousedown = mouse_down;
    canvas.onmouseup = mouse_up;
    canvas.onmouseout = mouse_out;
    canvas.onmousemove = mouse_move;


    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, rect.width, rect.height);

    centerX = rect.width / 2;
    centerY = rect.height / 2;

    const REAL_WIDTH_INCHES = 141.5;

    scaleX = rect.width / REAL_WIDTH_INCHES;
    scaleY = rect.height / REAL_WIDTH_INCHES;


    //pose drawing



    let draw = () => {

      ctx.clearRect(0, 0, rect.width, rect.height);


      //path drawing using bspline class
      localPaths.forEach((path) => {
        const spline = new bsplineClass(path, localPoses);

        const points: Vector[] = [];
        const numPoints = (path.controlPoints.length + 2) * 200;

        for (let i = 0; i <= numPoints; i++) {
          const t = i / numPoints;
          const point = spline.evaluate(t);
          points.push(point);
        }

        if (points.length > 0) {
          ctx.beginPath();
          ctx.strokeStyle = path.color;
          ctx.lineWidth = 3;
          ctx.setLineDash([])
          points.forEach((pt, index) => {
            const cpX = centerX + (pt.x * scaleX);
            const cpY = centerY - (pt.y * scaleY);

            if (index === 0) {
              ctx.moveTo(cpX, cpY);
            } else {
              ctx.lineTo(cpX, cpY);
            }
          });

          ctx.stroke();
        }
      });


      //shape drawing

      shapes.forEach((shape) => {
        if (shape.type == "native") {
          ctx.beginPath();
          ctx.fillStyle = shape.color;
          const { x, y } = toPx(shape.coords)
          ctx.arc(x, y, 3, 0, 2 * Math.PI);
          ctx.fill();
          ctx.beginPath();
          ctx.strokeStyle = shape.color;
          ctx.lineWidth = 3;
          ctx.setLineDash([])
          ctx.arc(x, y, 7, 0, 2 * Math.PI);
          ctx.stroke();

        } else if (shape.type == "pose") {
          ctx.beginPath();
          const { x, y } = toPx(shape.coords)
          ctx.arc(x, y, 7, 0, 2 * Math.PI);
          ctx.fillStyle = shape.color;
          ctx.fill();
        } else if (shape.type == "arc" && shape.coords2) {


          let point: Vector = { x: 0, y: 0 };
          let control: ControlPoint;
          //find control point
          localPaths.forEach((path) => {
            path.controlPoints.forEach((CP) => {
              if (CP.isNative && CP.nativeParameter && CP.id == shape.id) {
                point = toPx(CP.nativeParameter.coord);
                control = CP;
              } else if (CP.poseId == shape.id) {
                const pose = localPoses.find((pose) => pose.id == CP.poseId)
                point = toPx({ x: pose?.x ?? 0, y: pose?.y ?? 0 })
                control = CP;
              }
            })

          })
          //left
          ctx.beginPath();
          const { x: xL, y: yL } = toPx(shape.coords)
          ctx.arc(xL, yL, 5, 0, 2 * Math.PI);
          ctx.strokeStyle = shape.color;
          ctx.lineWidth = 2;
          ctx.setLineDash([]);
          ctx.stroke();

          //right
          ctx.beginPath();
          const { x: xR, y: yR } = toPx(shape.coords2)
          ctx.arc(xR, yR, 5, 0, 2 * Math.PI);
          ctx.strokeStyle = shape.color;
          ctx.lineWidth = 2;
          ctx.setLineDash([]);
          ctx.stroke();
          

          
          const radiusL = Math.abs(Math.sqrt((point.x - xL) ** 2 + (point.y - yL) ** 2))
          const radiusR = Math.abs(Math.sqrt((point.x - xR) ** 2 + (point.y - yR) ** 2))

          
          const radius = Math.min(radiusL, radiusR)

          

          

          ctx.beginPath();
          ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
          ctx.strokeStyle = `rgba(128,128,128,${currentShapeRef.current.id == shape.id ? "1" : "0.3"}`
          ctx.setLineDash([radius / 5, 5])
          ctx.lineWidth = 1;
          ctx.stroke();


          if (currentShapeRef.current.id == shape.id) {
            ctx.beginPath();
            ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
            ctx.fillStyle = `rgba(128,128,128,0.3)`
            ctx.setLineDash([])
            ctx.lineWidth = 1;
            ctx.fill();



            //text drawing
            shapes.forEach((shape) => {
              if (currentShapeRef.current.id == shape.id && (shape.type == "native" || shape.type == "pose")) {
                ctx.beginPath();


                if (currentShapeRef.current.currentArc == "left") {
                  const P0: Vector = shape.coords
                  const P1: Vector = currentShapeRef.current.coords

                  const lerp = new VectorLerp(P0, P1)

                  const coords: Vector = lerp.evaluate(0.5)
                  const textCoords: Vector = toPx(coords)

                  let transX = -5, transY = -15;
                  const { x, y } = toPx(coords)
                  ctx.roundRect(x + transX, y + transY, 80, 25, 10);
                  ctx.fillStyle = "rgba(255,0,0,0.4)";
                  ctx.fill();
                  ctx.beginPath();

                  ctx.fillStyle = "white";

                  ctx.fillText(`Radius: ${(radius / scaleX).toFixed(3)}`, textCoords.x, textCoords.y)

                } else if (currentShapeRef.current.currentArc == "right" && currentShapeRef.current.coords2) {
                  const P0: Vector = shape.coords
                  const P1: Vector = currentShapeRef.current.coords2

                  const lerp = new VectorLerp(P0, P1)

                  const coords: Vector = lerp.evaluate(0.7)
                  const textCoords: Vector = toPx(coords)

                  let transX = -5, transY = -15;
                  const { x, y } = toPx(coords)
                  ctx.roundRect(x + transX, y + transY, 80, 25, 10);
                  ctx.fillStyle = "rgba(255,0,0,0.4)";
                  ctx.fill();
                  ctx.beginPath();

                  ctx.fillStyle = "white";

                  ctx.fillText(`Radius: ${(radius / scaleX).toFixed(3)}`, textCoords.x, textCoords.y)
                }
              }
            })
          }
        }
      })



      //box drawing
      shapes.forEach((shape) => {
        if (currentShapeRef.current.id == shape.id && (shape.type == "native" || shape.type == "pose")) {
          ctx.beginPath();
          let transX = 10, transY = 10;
          const { x, y } = toPx(shape.coords)
          if (shape.coords.x <= 0 && shape.coords.y >= 0) transX = 10, transY = 10;
          if (shape.coords.x >= 0 && shape.coords.y >= 0) transX = -10 - 75, transY = 10;
          if (shape.coords.x <= 0 && shape.coords.y <= 0) transX = 10, transY = -10 - 25;
          if (shape.coords.x >= 0 && shape.coords.y <= 0) transX = -10 - 75, transY = -10 - 25;
          ctx.roundRect(x + transX, y + transY, 75, 25, 10);
          ctx.fillStyle = "rgba(255,0,0,0.4)";
          ctx.fill();
        }
      })

      //text drawing
      shapes.forEach((shape) => {
        if (currentShapeRef.current.id == shape.id && (shape.type == "native" || shape.type == "pose")) {
          ctx.beginPath();

          ctx.fillStyle = "white";

          const { x, y } = toPx(shape.coords)

          let transX = 15, transY = 25;

          if (shape.coords.x <= 0 && shape.coords.y >= 0) transX = 15, transY = 25 + 1;
          if (shape.coords.x >= 0 && shape.coords.y >= 0) transX = -15 - 63, transY = 25 + 1;
          if (shape.coords.x <= 0 && shape.coords.y <= 0) transX = 15 - 2, transY = -25 + 5;
          if (shape.coords.x >= 0 && shape.coords.y <= 0) transX = -15 - 65, transY = -25 + 6;


          ctx.fillText("(" + shape.coords.x.toFixed(2) + "," + shape.coords.y.toFixed(2) + ")", x + transX, y + transY);
        }
      })

    }

    draw();






  }, [poses, paths, imageLoaded, reRender]);


  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden min-h-0 min-w-0 p-2">
      <div className="relative flex items-center justify-center w-full h-full max-w-full max-h-full min-h-0 min-w-0">
        <div className="relative flex items-center justify-center aspect-square max-w-full max-h-full w-full h-full">
          <img
            ref={imageRef}
            src={image}
            className="w-full h-full object-contain select-none pointer-events-none"
            alt="Field"
            draggable="false"
            id="field"
            unselectable="on"
            onLoad={() => setImageLoaded(true)}
          />

          <canvas
            ref={canvasRef}
            id="field-canvas"
            className="absolute inset-0 w-full h-full pointer-events-none"
          />
        </div>
      </div>
    </div>
  );
}