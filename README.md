# Apex Pathing Visualizer

welcome to the Apex Pathing Visualizer!

This visualizer is for Apex Pathing, a Pathing software for the First Tech Challenge. **The visualizer is currently in development.**

The visualizer was made to aid users of Apex Pathing in creating paths for the autonomous period. The framework used is Next.js, it is coded in React Typescript, and shadcn is used for basically all of the UI components.


# Links

There are two visualizer links, the main/stable version, and the development link

The development link is for dev purposes and features on it might not be pushed to main version

Main deployment: https://visualizer.apexpathing.com/

Dev deployment:  https://visualizer-one-drab.vercel.app/

## Currently implemented features
* Adding poses to the field
* Adding paths with poses on field as control points
* Drag and drop for poses
* Settings menu with options for custom fields, drivetrain type, and default unit
* Arc pose functionality like how the [docs](https://www.apexpathing.com/docs/arc-poses) state, letting you customize the radius of the arc pose. Currently, dragging on the field to edit radius is mostly-functional and bugs almost sorted out.
* Heading interpolation selection
* Custom pose and path colors
* Double clicking empty space to add a native control point on your current path. Double click on an existing pose or native control point in order to delete it. Click "A" to add a pose at (0,0) and click "N" to add a native control point at (0,0)

## How to use

The visualizer isn't currently done, but you are still able to use it to map out your paths. First, add your path by clicking the add path button. Then, you can either choose to add native control points, or your created poses on from the pose button. Then, drag these control points around to create your path. Add as many paths as you want to make you autonomous complete! You also have extra options like arc poses, which let you make your path tighter with less control points. Arc poses are defined by a radius R. Read more about it on our [docs](https://www.apexpathing.com/docs/arc-poses). You can also double click to easily add control points to your path. Click on another path to add control points to that one with this method.

## Development and locally running the visualizer
To aid in development, fork the main [repository](https://github.com/ApexPathing/visualizer) and make sure you have node.js and npm installed. Then, download and save the repository somewhere safe. Then, open terminal and use the ``cd`` command to navigate to the folder you saved the repository in and run ``npm i`` to install all of the node packages. Then run ``npm run dev`` to run the visualizer at  ``localhost:3000`` in your browser. In the ide of your choice, open the folder you saved the repository in and you can change the code. Make sure to save the code in order to see the changes at ``localhost:3000``.

## Video Demo
Here is a quick video demo on how you can create paths, it will be updated as development continues:
https://github.com/user-attachments/assets/6c933b1b-8ec2-4ceb-854c-25a9bbe3b551


