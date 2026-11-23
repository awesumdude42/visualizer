import { Copy, Grid2X2, MousePointer, RulerDimensionLine } from "lucide-react";
import { Button } from "./ui/button";
import { Angle } from 'lucide-react';
import { useState } from "react";
import { Progress } from "./ui/progress";


export default function PlaybackControls() {


    //keeping state here for now
    const [value, setValue] = useState(100)




    return (

        <div className=" flex flex-row rounded-lg border min-h-15 items-center grow justify-center">
            {/* I think the strat is to use a shadcn progress and use zustand to convey t to it

            max T will be 1 * numOfPaths and we can use normalize it and use a lerp to smoothly move across the line
            to normalize, we need to multiply the t value by a variable such the t is proportional to its value in the regular thing
            


            for example, if there were 4 paths and we just finished the first path, it would be t  = 1; then,
            t_n(normalized) would be 0.25 so the value would be 1/numOfPaths


            // to get the total t value, we can store a currentPath, loop through all pathsand add to a cumulativeSum currentT, 
            // then, in the current path, we just loop through t from 0 to 1 in that path once it reaches 1, add 1 to the currentT
            // and reset current path



            */}

            <div className="bg-red-500">
                PROGRESS BAR PLACEHOLDER
            </div>
            <div className="ml-100 flex gap-4">
                <Button className="w-10 h-10 border-2 rounded-md" variant={"outline"}>

                    <RulerDimensionLine color="#C00000" />
                </Button>

                <Button className="w-10 h-10 border-2 rounded-md" variant={"outline"}>
                    <Angle color="#C00000" />
                </Button>

                <Button className="w-10 h-10 border-2 rounded-md" variant={"outline"}>
                    <Grid2X2 color="#C00000" />
                </Button>

                <Button className="w-10 h-10 border-2 rounded-md" variant={"outline"}>
                    <Copy color="#C00000" className="-mr-0.5" />
                    <MousePointer color="#C00000" className="-ml-3 mt-3" />

                </Button>

            </div>
        </div>
    );
}