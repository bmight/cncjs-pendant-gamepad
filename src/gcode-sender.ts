#!/usr/bin/env node

// gcode-sender
// The base class for Gcode senders. Sends messages to CNCjs via the
// connector service based on input from the actions service.
//
// Copyright (c) 2017-2022 various contributors. See LICENSE for copyright
// and MIT license information.

import { Options }     from './console';
import { Connector }   from './connector';
import { Actions }     from './actions';
import log from "npmlog";

//------------------------------------------------------------------------------
// Constant and interface definitions.
//------------------------------------------------------------------------------
const LOGPREFIX = 'GCODESNDR'; // keep at 9 digits for consistency
const ZSAFEPOS = -5.0;         // machine Z coordinate deemed safe for travel.
const ZSAFEV = 500;            // move to ZSAFEPOS velocity.


//------------------------------------------------------------------------------
// The base class isn't completely abstract, and contains some simple
// functionality that should be overridden by controller-specific classes.
//------------------------------------------------------------------------------
export class GcodeSender {
  options: Options;
  connector: Connector;

  constructor(actions: Actions) {
    this.options = actions.options;
    this.connector = actions.connector;
    }
  
  //--------------------------------------------------
  // controller operations: cyclestart
  //--------------------------------------------------
  controllerCyclestart() {
    this.sendMessage('command', 'cyclestart')
  }


  //--------------------------------------------------
  // controller operations: feedhold
  //--------------------------------------------------
  controllerFeedhold() {
    this.sendMessage('command', 'feedhold')
  }


  //--------------------------------------------------
  // controller operations: pause
  //--------------------------------------------------
  controllerPause() {
    this.sendMessage('command', 'pause')
  }


  //--------------------------------------------------
  // controller operations: reset
  //--------------------------------------------------
  controllerReset() {
    this.sendMessage('command', 'reset')
  }


  //--------------------------------------------------
  // controller operations: resume
  //--------------------------------------------------
  controllerResume() {
    this.sendMessage('command', 'resume')
  }


  //--------------------------------------------------
  // conntroller operations: start
  //--------------------------------------------------
  controllerStart() {
    this.sendMessage('command', 'start')
  }


  //--------------------------------------------------
  // conntroller operations: stop
  //--------------------------------------------------
  controllerStop() {
    this.sendMessage('command', 'stop')
  }


  //--------------------------------------------------
  // conntroller operations: unlock
  //--------------------------------------------------
  controllerUnlock() {
    this.sendMessage('command', 'unlock')
  }

  
  //--------------------------------------------------
  // coolant operations: flood on
  //--------------------------------------------------
  coolantFloodOn() {
    this.sendMessage('command', 'gcode', 'M8');
  }


  //--------------------------------------------------
  // coolant operations: mist on
  //--------------------------------------------------
  coolantMistOn() {
    this.sendMessage('command', 'gcode', 'M7');
  }


  //--------------------------------------------------
  // coolant operations: all coolant off
  //--------------------------------------------------
  coolantOff() {
    this.sendMessage('command', 'gcode', 'M9');
  }


  //--------------------------------------------------
  // move gantry: home position
  //  We'll use the G30 command to move to the home
  //  position (instead of a G53 offset). Our command
  //  should get to a safe Z height before starting
  //  to move XY.
  //--------------------------------------------------
  moveGantryHome() {
    this.sendMessage('command', 'gcode', `G0 G53 Z${ZSAFEPOS} F${ZSAFEV}`);
    this.sendMessage('command', 'gcode', `G30`);
  }


  //--------------------------------------------------
  // move gantry: relative movement (jogging)
  //--------------------------------------------------
  moveGantryJogToXYZ(x: number, y: number, z: number, mmPerMin: number) {
    this.moveGantryRelative(x ,y, z, mmPerMin);
  }


  //--------------------------------------------------
  // move gantry: relative movement
  //--------------------------------------------------
  moveGantryRelative(x: number, y: number, z: number, mmPerMin: number) {
    this.sendMessage('command', 'gcode', 'G21');  // set to millimeters
    this.sendMessage('command', 'gcode', `G91 G0 X${x.toFixed(4)} Y${y.toFixed(4)} Z${z.toFixed(4)} F${mmPerMin}`);
    this.sendMessage('command', 'gcode', 'G90');  // back to absolute coordinates
  }


  //--------------------------------------------------
  // move gantry: return position
  //  Move to the return position, going to a safe Z
  //  height before moving XY.
  //--------------------------------------------------
  moveGantryReturn() {
    this.sendMessage('command', 'gcode', `G0 G53 Z${ZSAFEPOS} F${ZSAFEV}`);
    this.sendMessage('command', 'gcode', `G28`);
  }


  //--------------------------------------------------
  // move gantry: WCS current 0,0,5 (G54)
  //  Move to the currently defined G54 position.
  //  Ensure that we're at a safe Z height before
  //  moving anywhere else.
  //--------------------------------------------------
  moveGantryWCSHome() {
    this.sendMessage('command', 'gcode', `G0 G53 Z${ZSAFEPOS} F${ZSAFEV}`);
    this.sendMessage('command', 'gcode', 'G0 G90 G54 X0 Y0');
  }


  //--------------------------------------------------
  // move gantry: z probe position
  //  Move to the currently defined G55 position.
  //  Ensure that we're at a safe Z height before
  //  moving anywhere else.
  //--------------------------------------------------
  moveGantryZProbePos() {
    this.sendMessage('command', 'gcode', `G0 G53 Z${ZSAFEPOS} F${ZSAFEV}`);
    this.sendMessage('command', 'gcode', 'G0 G90 G55 X0 Y0');
  }

  //--------------------------------------------------
  // move z: zero position
  //  Move only the Z axis to the Z safe position,
  //  which should be close to home.
  //--------------------------------------------------
  moveZedZero() {
    this.sendMessage('command', 'gcode', `G0 G53 Z${ZSAFEPOS} F${ZSAFEV}`);
  }


  //--------------------------------------------------
  // execute a homing operation
  //--------------------------------------------------
  performHoming() {
    this.sendMessage('command', 'homing');
  }

  
  //--------------------------------------------------
  // execute a probe operation
  //--------------------------------------------------
  performProbing() {
    const dz = Number(this.options.zProbeThickness) + 0.001;
    this.sendMessage('command', 'gcode', 'G91');                   // relative coordinates
    this.sendMessage('command', 'gcode', 'G38.2 Z-15.001 F120');   // probe toward stock
    this.sendMessage('command', 'gcode', 'G90');                   // back to absolute coordinates
    this.sendMessage('command', 'gcode', `G10 L20 P1 Z${dz}`);     // state that current Z is `dz`
    this.sendMessage('command', 'gcode', 'G91');                   // relative coordinates
    this.sendMessage('command', 'gcode', 'G0 Z3');                 // lift up just a bit
    this.sendMessage('command', 'gcode', 'G90');                   // back to absolute coordinates
  }

  //--------------------------------------------------
  // record current position as the return position.
  //--------------------------------------------------
  recordGantryReturn() {
    this.sendMessage('command', 'gcode', 'G28.1');
  }

  //--------------------------------------------------
  // record current position as a place to probe z.
  //--------------------------------------------------
  recordGantryZProbePos() {
    this.sendMessage('command', 'gcode', 'G10 P2 L20 X0 Y0 Z0');
  }

  //--------------------------------------------------
  // record current position as part 0,0.
  //--------------------------------------------------
  recordGantryWCSHome() {
    this.sendMessage('command', 'gcode', 'G10 P1 L20 X0 Y0 Z0');
  }

  //--------------------------------------------------
  // record current position as near machine home.
  //--------------------------------------------------
  recordGantryHome() {
    this.sendMessage('command', 'gcode', 'G30.1');
  }

  //--------------------------------------------------
  // turn spindle off
  //--------------------------------------------------
  spindleOff() {
    this.sendMessage('command', 'gcode', 'M5');
  }


  //--------------------------------------------------
  // turn spindle on to the specified speed
  //--------------------------------------------------
  spindleOn(speed: number) {
    this.sendMessage('command', 'gcode', `M3 S${speed}`);
  }


  //--------------------------------------------------------------------------
  // Handles sending messages to the cncjs socket server, or displaying
  // on screen when using `--fake-socket` option.
  //--------------------------------------------------------------------------
  sendMessage(eventName: string, directive: string, data?: any) {
    if (!this.options.simulate && this.connector.serialConnected) {
      this.connector.socket.emit(eventName, this.options.port, directive, data);
    } else {
      if (eventName == 'command') {
        if (directive == 'gcode')
          log.info(LOGPREFIX, `Gcode ${data}`);
        else
          log.info(LOGPREFIX, `Command ${directive}`);
      } 
      else
        log.warn(LOGPREFIX, `Unknown command ${eventName}: ${directive}, ${data}`);
    }
  }
};