export class Lerp{
    
    P1:Vector
    P2:Vector
    poses:Pose[]

    
    
    
    
    constructor(P1:ControlPoint, P2:ControlPoint,poses:Pose[]){
        this.poses = poses;
        if(P1.isNative && P1.nativeParameter){
            this.P1 = P1.nativeParameter.coord
        }else{
            const pose = poses.find((pose)=>pose.id == P1.poseId)
            
            this.P1 = {
                x:pose?.x ?? 0,
                y:pose?.y ?? 0
            }
        }
        
        if(P2.isNative && P2.nativeParameter){
            this.P2 = P2.nativeParameter.coord
        }else{
            const pose = poses.find((pose)=>pose.id == P2.poseId)
           
            this.P2 = {
                x:pose?.x ?? 0,
                y:pose?.y ?? 0
            }
        }
    }

    evaluate(t:number){
        if (t >= 1.0) t = 0.999999
        if (t < 0.0) t = 0.0
        const returnValue:Vector = {
            x:((1-t) * this.P1.x) + (this.P2.x * t),
            y:((1-t) * this.P1.y) + (this.P2.y * t)
        }
        return returnValue
    }
    
    getDistance(){
        return Math.abs(Math.sqrt((this.P1.y - this.P2.y)**2 + (this.P1.x - this.P2.x)**2))
        
    }

    getX(y:number){
        

        
        const t = (y - this.P1.y) / (this.P2.y - this.P1.y)

        const vector  = this.evaluate(t)

        return vector.x;
    }

    getY(x:number){
        const t = (x - this.P1.x) / (this.P2.x - this.P1.x)

        const vector  = this.evaluate(t)

        return vector.y;
    }

    clampX(x: number) {
        const denominator = this.P2.x - this.P1.x;
        if (denominator === 0) return this.P1.x;// horizontal line
        return this.evaluate((x - this.P1.x) / denominator).x;
      }
      
    clampY(y: number) {
    const denominator = this.P2.y - this.P1.y;
    if (denominator === 0) return this.P1.y;
    return this.evaluate((y - this.P1.y) / denominator).y;
    }

    getSlope(){
        return (this.P2.y - this.P1.y)/(this.P2.x - this.P1.x)
    }

    getOffset(offset:Vector,t:number){
        if (t >= 1.0) t = 0.999999
        if (t < 0.0) t = 0.0

        //different cases, there is prob a way to handle this better, but i dont wanna do it right
        if(this.getSlope() == Infinity){
            offset = {
                x:offset.x,
                y:0,
            }
        }else if(this.getSlope() == -Infinity){
            offset = {
                x:-offset.x,
                y:0,
            }
        }else if(this.getSlope() >= 1){
            offset = {
                x:-offset.x,
                y:0
            }
        }else if(this.getSlope() <= -1){
            offset = {
                x:offset.x,
                y:0
            }
        }
        else if(this.getSlope() > 0 || this.getSlope() == 0 || this.getSlope() > -1){
            offset = {
                x:0,
                y:offset.y
            }
        }else if(isNaN(this.getSlope())){
            offset = offset;
        }
        
        const returnValue:Vector = {
            x:((1-t) * this.P1.x) + (this.P2.x * t + offset.x),
            y:((1-t) * this.P1.y) + (this.P2.y * t + offset.y)
        }

        return returnValue;
    }
}
//TYPESCRIPT OVERLOADING IS SO BOOTY
export class VectorLerp{
    
    P1:Vector
    P2:Vector
    
    constructor(P1:Vector, P2:Vector){
        this.P1 = P1;
        this.P2 = P2;
    }

    evaluate(t:number){
        if (t >= 1.0) t = 0.999999
        if (t < 0.0) t = 0.0
        const returnValue:Vector = {
            x:((1-t) * this.P1.x) + (this.P2.x * t),
            y:((1-t) * this.P1.y) + (this.P2.y * t)
        }
        return returnValue
    }
    
    getDistance(){
        return Math.abs(Math.sqrt((this.P1.y - this.P2.y)**2 + (this.P1.x - this.P2.x)**2))
        
    }

    getX(y:number){
        

        
        const t = (y - this.P1.y) / (this.P2.y - this.P1.y)

        const vector  = this.evaluate(t)

        return vector.x;
    }

    getY(x:number){
        const t = (x - this.P1.x) / (this.P2.x - this.P1.x)

        const vector  = this.evaluate(t)

        return vector.y;
    }

    clampX(x: number) {
        const denominator = this.P2.x - this.P1.x;
        if (denominator === 0) return this.P1.x;// horizontal line
        return this.evaluate((x - this.P1.x) / denominator).x;
      }
      
    clampY(y: number) {
    const denominator = this.P2.y - this.P1.y;
    if (denominator === 0) return this.P1.y;
    return this.evaluate((y - this.P1.y) / denominator).y;
    }

    getSlope(){
        return (this.P2.y - this.P1.y)/(this.P2.x - this.P1.x)
    }

    getOffset(offset:Vector,t:number){
        if (t >= 1.0) t = 0.999999
        if (t < 0.0) t = 0.0

        //different cases, there is prob a way to handle this better, but i dont wanna do it right
        if(this.getSlope() == Infinity){
            offset = {
                x:offset.x,
                y:0,
            }
        }else if(this.getSlope() == -Infinity){
            offset = {
                x:-offset.x,
                y:0,
            }
        }else if(this.getSlope() >= 1){
            offset = {
                x:-offset.x,
                y:0
            }
        }else if(this.getSlope() <= -1){
            offset = {
                x:offset.x,
                y:0
            }
        }
        else if(this.getSlope() > 0 || this.getSlope() == 0 || this.getSlope() > -1){
            offset = {
                x:0,
                y:offset.y
            }
        }else if(isNaN(this.getSlope())){
            offset = offset;
        }
        
        const returnValue:Vector = {
            x:((1-t) * this.P1.x) + (this.P2.x * t + offset.x),
            y:((1-t) * this.P1.y) + (this.P2.y * t + offset.y)
        }

        return returnValue;
    }
}