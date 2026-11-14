'use client';

import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { bsplineClass } from '@/lib/bsplineClass';
import { Settings } from "@/hooks/use-visualizer";
import { Cpu } from "lucide-react";
import PlaybackControls from "./playback-controls";

interface PathDrawProps {
  poses: Pose[];
  paths: Path[];
  updatePose: (id: number, updatedFields: Partial<Pose>) => void;
  reRender: boolean 
  currentPathIndex:number
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

  

  const{
    image
  } = Settings();
  


  
  const [imageLoaded, setImageLoaded] = useState(false);

  


 

  
  let startX:number;
  let startY:number;

  let centerX:number;
  let centerY:number;
  let scaleX:number;
  let scaleY:number;


  
  const currentShapeRef = useRef<Shape>(currentShape)
  let isDraggingShapeRef = useRef<boolean>(false);


  

  function toPx(p:Vector){
    return { x: centerX + p.x * scaleX, y: centerY - p.y * scaleY }
  }


  

  

  
 

  useEffect(() => {

    
    const shapes:Shape[] = []

    //add poses
    poses.forEach((pose)=>{
      shapes.push({
        id:pose.id,
        type:"pose",
        coords:{
          x:pose.x ?? 0,
          y:pose.y ?? 0
        },
        color: pose.color
      })
    })

    const localPoses = poses.map(pose => ({ ...pose }));

    const localPaths = paths.map(path => ({ ...path }));

    //add native control points
    localPaths.forEach((path)=>{

      //first
      shapes.push({
        id:path.firstPose.id,
        type:"native",
        coords:path.firstPose.nativeParameter?.coord ?? {x:0,y:0},
        color: path.color
      })
      //addable/subtractable
      path.controlPoints.forEach((CP)=>{
        if(CP.isNative && CP.nativeParameter)
          shapes.push({
            id:CP.id,
            type:"native",
            coords:CP.nativeParameter.coord,
            color: path.color
          })
      })
      //end
      shapes.push({
        id:path.endPose.id,
        type:"native",
        coords:path.endPose.nativeParameter?.coord ?? {x:0,y:0},
        color: path.color
      })
    })

  
      
    
    


    
    


    //drag and drop checker
    let is_mouse_in_shape = (x:number, y:number,shape:Shape) =>{ //TODO make sure this handles arcposes correctly
      let tolerance = 10;
      if(shape.type == "native") tolerance = 12;

      const s = toPx(shape.coords)
      let squaredDist = (x - s.x)**2 + (y - s.y)**2


      if(shape.type == "pose")return squaredDist <= 7**2 + tolerance**2
      else return squaredDist <= 8**2 + tolerance**2
    }



  
    let is_mouse_in_path = (x:number,y:number,spline:bsplineClass,path:Path)=>{
      const numPoints = (path.controlPoints.length + 2)* 200;

      const tolerance = 5;

      for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        const pt = spline.evaluate(t);

        const cpX = centerX + (pt.x * scaleX);
        const cpY = centerY - (pt.y * scaleY);
        const squaredDist = (x - cpX) ** 2 + (y - cpY) ** 2;
        if (squaredDist <= tolerance**2) {
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
        if (is_mouse_in_shape(startX, startY, shape)) {
          currentShapeRef.current = shape;                              
          setCurrentShape({ ...shape, coords: { ...shape.coords } });  
          isDraggingShapeRef.current = true;
          reached = true;
          draw();
          break;
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
      if(isDraggingShapeRef.current){
        shapes.forEach((shape)=>{
          //path stuff
          if(shape.type == "native"){
            
            localPaths.forEach((path,index)=>{
              path.controlPoints.forEach((CP)=>{
                if(CP.id == shape.id){
                  updateNativePoint(path.id,CP.id,{coord:{
                    x:Number(shape.coords.x.toFixed(3)),
                    y:Number(shape.coords.y.toFixed(3))}})
                  }
                if(shape.id == CP.id) setCurrentPathIndex(index)
              })
              if(path.firstPose.id == shape.id){
                updateFirstPose(path.id,{coord:{
                  x:Number(shape.coords.x.toFixed(3)),
                  y:Number(shape.coords.y.toFixed(3))}})
                if(shape.id == path.firstPose.id) setCurrentPathIndex(index)
              }
              if(path.endPose.id == shape.id){
                updateEndPose(path.id,{coord:{
                  x:Number(shape.coords.x.toFixed(3)),
                  y:Number(shape.coords.y.toFixed(3))}})
                  if(shape.id == path.endPose.id) setCurrentPathIndex(index)
              }
            })
            //pose stuff
          }else if(shape.type == "pose"){
            updatePose(shape.id,{
              x:Number(shape.coords.x.toFixed(3)),
              y:Number(shape.coords.y.toFixed(3))
            })
          }
        })

        isDraggingShapeRef.current = false;
      }
    };


    let mouse_out = (event: MouseEvent) => {
    
      if(isDraggingShapeRef.current){
        shapes.forEach((shape)=>{
          //path stuff
          if(shape.type == "native"){
            localPaths.forEach((path)=>{
              path.controlPoints.forEach((CP)=>{
                if(CP.id == shape.id){
                  updateNativePoint(path.id,CP.id,{coord:{
                    x:Number(shape.coords.x.toFixed(3)),
                    y:Number(shape.coords.y.toFixed(3))}})
                  }
              })
              if(path.firstPose.id == shape.id){
                updateFirstPose(path.id,{coord:{
                  x:Number(shape.coords.x.toFixed(3)),
                  y:Number(shape.coords.y.toFixed(3))}})
              }
              if(path.endPose.id == shape.id){
                updateEndPose(path.id,{coord:{
                  x:Number(shape.coords.x.toFixed(3)),
                  y:Number(shape.coords.y.toFixed(3))}})
              }
            })
            //pose stuff
          }else if(shape.type == "pose"){
            updatePose(shape.id,{
              x:Number(shape.coords.x.toFixed(3)),
              y:Number(shape.coords.y.toFixed(3))
            })
          }
        })
      }
      

      isDraggingShapeRef.current = false;
     
    };

    let mouse_move = (event:MouseEvent) =>{

      if(ctx && isDraggingShapeRef.current) ctx.globalAlpha = 0.7;
      
      let mouseX = event.clientX - rect.left;
      let mouseY = event.clientY - rect.top;
      if(isDraggingShapeRef.current){
        let dx = mouseX - startX;
        let dy = mouseY - startY;


        let coords = currentShapeRef.current.coords;
        
        if(coords && currentShapeRef.current)
         currentShapeRef.current.coords = {
            x: coords.x + dx / scaleX,
            y: coords.y - dy / scaleY,
          };

          if(currentShapeRef.current.type == "native"){
            localPaths.forEach((path)=>{
              path.controlPoints.forEach((CP)=>{
                if(currentShapeRef.current.id == CP.id && CP.nativeParameter){
                  CP.nativeParameter.coord = {
                    x: coords.x + dx / scaleX,
                    y: coords.y - dy / scaleY
                  }
                }
              })
              if(path.firstPose.id == currentShapeRef.current.id && path.firstPose.nativeParameter){
                  path.firstPose.nativeParameter.coord = {
                    x: coords.x + dx / scaleX,
                    y: coords.y - dy / scaleY
                  }
              }
              if(path.endPose.id == currentShapeRef.current.id && path.endPose.nativeParameter){
                path.endPose.nativeParameter.coord = {
                  x: coords.x + dx / scaleX,
                  y: coords.y - dy / scaleY
                } 
              }
            })
          }else if (currentShapeRef.current.type == "pose"){
            let activePose = localPoses.find((pose)=>pose.id == currentShapeRef.current.id)

            if(activePose){
              activePose.x = coords.x + dx / scaleX;
              activePose.y = coords.y - dy / scaleY;
            }
            
          }

        
        draw();

        startX = mouseX;
        startY = mouseY;
      }else{
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
    canvas.onmouseup= mouse_up;
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
    
   

    let draw = ()=>{
      
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

      shapes.forEach((shape)=>{
        if(shape.type == "native"){
          ctx.beginPath();
          ctx.fillStyle = shape.color;
          const {x,y} = toPx(shape.coords)
          ctx.arc(x, y, 3, 0, 2 * Math.PI); 
          ctx.fill();

          ctx.beginPath();
          ctx.arc(x, y, 7, 0, 2 * Math.PI);  
          ctx.stroke(); 
        }else if(shape.type == "pose"){
          ctx.beginPath();
          const {x,y} = toPx(shape.coords)
          ctx.arc(x,y, 7, 0, 2 * Math.PI);  
          ctx.fillStyle = shape.color;
          ctx.fill();
        }
      })

      

     //box drawing
      shapes.forEach((shape)=>{
        if(currentShapeRef.current.id == shape.id){
          ctx.beginPath();
          let transX = 10,transY = 10;
              const {x,y} = toPx(shape.coords)
              if(shape.coords.x <= 0 && shape.coords.y >= 0) transX = 10, transY = 10;
              if(shape.coords.x >= 0 && shape.coords.y >= 0) transX = -10 - 75, transY = 10;
              if(shape.coords.x <= 0 && shape.coords.y <= 0) transX = 10, transY = -10 - 25;
              if(shape.coords.x >= 0 && shape.coords.y <= 0) transX = -10 - 75, transY = -10 - 25;
            ctx.roundRect(x + transX ,y + transY,75,25,10);
            ctx.fillStyle = "rgba(255,0,0,0.4)";
            ctx.fill();
        }
      })

      //text drawing
      shapes.forEach((shape)=>{
        if(currentShapeRef.current.id == shape.id){
          ctx.beginPath();
          
          ctx.fillStyle = "white";
          
          const {x,y} = toPx(shape.coords)

          let transX = 15,transY = 25;

          if(shape.coords.x <= 0 && shape.coords.y >= 0) transX = 15, transY = 25 + 1;
          if(shape.coords.x >= 0 && shape.coords.y >= 0) transX = -15 - 63, transY = 25+1;
          if(shape.coords.x <= 0 && shape.coords.y <= 0) transX = 15 - 2, transY = -25 + 5;
          if(shape.coords.x >= 0 && shape.coords.y <= 0) transX = -15 - 65, transY = -25 + 6;
          

          ctx.fillText("(" + shape.coords.x.toFixed(2) + "," + shape.coords.y.toFixed(2) + ")",x + transX , y + transY);
        }
      })

    }
    
    draw();


    
   
    
  
  }, [poses, paths, imageLoaded,reRender]);


  return (
    
    <div className="flex h-full w-full items-center justify-center overflow-hidden min-h-0 min-w-0">

      <div 
      className="relative flex flex-col max-h-full max-w-full min-h-0 min-w-0 items-center justify-center"
      style={{ maxWidth: '735px', maxHeight: '735px' }}
      >
      
        <img
          ref={imageRef}
          src={image}
          className="block aspect-square max-h-full max-w-full w-auto h-auto object-contain select-none pointer-events-none"
          alt="Field"
          draggable="false"
          id="field"
          unselectable = "on"
          onLoad={() => setImageLoaded(true)}
        />
        
        <canvas
          ref={canvasRef}
          id="field-canvas"
          className="absolute inset-0 w-full h-full "
        />
      </div>
      
    </div>
  );
}