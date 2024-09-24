/**
 * @license
 * Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import * as posenet_module from '@tensorflow-models/posenet';
import * as facemesh_module from '@tensorflow-models/facemesh';
import * as tf from '@tensorflow/tfjs';
import * as paper from 'paper';
import dat from 'dat.gui';
import Stats from 'stats.js';
import "babel-polyfill";

import {drawKeypoints, drawPoint, drawSkeleton, isMobile, toggleLoadingUI, setStatusText} from './utils/demoUtils';
import {SVGUtils} from './utils/svgUtils'
import {PoseIllustration} from './illustrationGen/illustration';
import {Skeleton, facePartName2Index} from './illustrationGen/skeleton';
import {FileUtils} from './utils/fileUtils';

import * as girlSVG from './resources/illustration/girl.svg';
import * as mikuSVG from './resources/illustration/miku.svg';
import * as boySVG from './resources/illustration/boy.svg';
import * as hyumaSVG from './resources/illustration/hyuma.svg';
import * as abstractSVG from './resources/illustration/abstract.svg';
import * as blathersSVG from './resources/illustration/blathers.svg';
import * as tomNookSVG from './resources/illustration/tom-nook.svg';

var wfurl = ""; //"http://localhost:8080"; //wfurl = "http://retermpi.local:8080";
var wfurl2= ""; "http://retermpi.local:8080";

var led_url= "http://raspi4.local:3000/led";

var th = 0.9

async function wait(second) {
  return new Promise(resolve => setTimeout(resolve, 1000 * second));
}

// Camera stream video element
let video;
let videoWidth = 300;
let videoHeight = 300;

// Canvas
let faceDetection = null;
let illustration = null;
let canvasScope;
let canvasWidth = 800;
let canvasHeight = 1000;

// ML models
let facemesh;
let posenet;
let minPoseConfidence = 0.15;
let minPartConfidence = 0.1;
let nmsRadius = 30.0;

// Misc
let mobile = false;
const stats = new Stats();
const avatarSvgs = {
  'girl': girlSVG.default,
  'Miku': mikuSVG.default,
  'boy': boySVG.default,
  'Hyuma': hyumaSVG.default,
  'abstract': abstractSVG.default,
  'blathers': blathersSVG.default,
  'tom-nook': tomNookSVG.default,
};

var countbox  = document.getElementById("countbox");
var countMsg  = document.getElementById("countMsg");
//sg = document.getElementById("headerMsg");

/**
const imageScaleFactor = 0.2;
const outputStride = 16;
const flipHorizontal = false;
const stats = new Stats();
const contentWidth = 800;
const contentHeight = 600; **/

const ballNum = 3;
const colors = ["red","blue","green"];
const fontLayout = "bold 50px Arial";
let balls = [];
let score = 0;
let timeLimit = 2000;
let printLimit = timeLimit / 10;
/* let naviko = new Image();
let navScale = 1
naviko.src = "naviko.png"*/
balls = initBalls(ballNum);

function drawWristPoint(wrist,ctx){
  ctx.beginPath();
  ctx.arc(wrist.position.x , wrist.position.y, 10, 0, 2 * Math.PI);
  ctx.fillStyle = "pink";
  ctx.fill();
}

/**
function drawNaviko(nose, leye, ctx){
  navScale = (leye.position.x - nose.position.x - 50) / 20;
  if (navScale < 1) navScale = 1;
  let nw = naviko.width * navScale;
  let nh = naviko.height * navScale;
  ctx.drawImage(naviko,nose.position.x - nh / 2 , nose.position.y - nh / 1.5, nw, nh);
}**/

var icon = "●"; //"★";
var goal = "ゴールまで";
var obj  = "星";
let speedNum = 1;

function ballsDecision(ctx,wrists,speedNum=1){
  for(var i=0;i<ballNum;i++){
      balls[i].y += speedNum;
      if (balls[i].y > videoHeight) {
          balls[i] = resetBall();
          return;
      }  else {
        wrists.forEach((wrist) => {
          if((balls[i].x - 50)  <= wrist.position.x && wrist.position.x <= (balls[i].x + 50) &&
            wrist.score > 0.5 &&
            (balls[i].y - 20) <= wrist.position.y && wrist.position.y <= (balls[i].y + 20)){
              ctx.fillText("ゲット！！", balls[i].x , balls[i].y, 300); //, 20, 0, 2 * Math.PI);
              ctx.fillStyle = balls[i].color
              ctx.fill();
              /*if (balls[i].color == "green") {
                score += 3;
              } else {*/
                score += 1;
              //}
              onfire(2); //GoForward = 2
              balls[i] = resetBall();

              countbox.innerHTML = parseInt(countbox.innerHTML) + 1;
              console.log(countbox.innerHTML);

              /**
              if (countbox.innerHTML % 10 == 0) {
                $("#all").css('background-color','orange');
                Http.open("GET", led_url + "/on");
                Http.send();
                Http.onreadystatechange = (e) => {
                  console.log(Http.responseText)
                }
              } else {
                $("#all").css('background-color','yellow');
                Http.open("GET", led_url + "/off");
                Http.send();
                Http.onreadystatechange = (e) => {
                  console.log(Http.responseText)
                }
              } **/
            }
        });
        ctx.beginPath();
        //ctx.arc(balls[i].x , balls[i].y, 20, 0, 2 * Math.PI);
        ctx.fillText(icon, balls[i].x , balls[i].y); //, 20, 0, 2 * Math.PI);
        ctx.fillStyle = balls[i].color
        ctx.fill();
      }
  }
}

function resetBall(){
  let color = Math.floor(Math.random()*3);
  return {color:colors[color], x:Math.floor(Math.random()*(videoWidth - 50) + 50), y:0}
}
function initBalls(n=5){
  let x,y
  let initBalls = []
  for(var i=0;i<n;i++){
      let ball = resetBall();
      initBalls.push(ball);
  }
  return initBalls;
}



function starMaker(n) {
  var star = document.createElement("div");
  star.className = "star";
  star.textContent = "★";
  for(var i = 0; i < n; i++) {
      starSet(star);
  }
}

function ballSet(ballDiv) {
  var ballClone = ballDiv.cloneNode(true);
  var ballStyle = ballClone.style;
  //星の位置（left）、アニメーションの遅延時間（animation-delay）、サイズ（font-size）をランダムで指定
  ballStyle.left = 100 * Math.random() + "%";
  ballStyle.animationDelay = 8 * Math.random() + "s";
  ballStyle.fontSize = ~~(50 * Math.random() + 100) + "px";
  document.body.appendChild(ballClone);
  //星一つのアニメーションが終わったら新しい星を生成
  ballClone.addEventListener("animationend", function() {
    this.parentNode.removeChild(this);
    var ballDiv = document.createElement("div");
    ballDiv.className = "ballClass";
    ballDiv.textContent = "⚾️";
    ballSet(ballDiv);
  }, false)
}

//星のセッティングをする関数。
function starSet(clone) {
  var starClone = clone.cloneNode(true);
  var starStyle = starClone.style;

  //星の位置（left）、アニメーションの遅延時間（animation-delay）、サイズ（font-size）をランダムで指定
  starStyle.left = 100 * Math.random() + "%";
  starStyle.animationDelay = 8 * Math.random() + "s";
  starStyle.fontSize = ~~(50 * Math.random() + 100) + "px";
  document.body.appendChild(starClone);

  //星一つのアニメーションが終わったら新しい星を生成
  starClone.addEventListener("animationend", function() {
      this.parentNode.removeChild(this);
      var star = document.createElement("div");
      star.className = "star";
      star.textContent = icon;
      starSet(star);
  }, false)
}
//使用例。星を5個ふらせます。
//starMaker(5)


/**
 * Loads a the camera to be used in the demo
 *
 */
async function setupCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error(
        'Browser API navigator.mediaDevices.getUserMedia not available');
  }

  const video = document.getElementById('video');
  video.width = videoWidth;
  video.height = videoHeight;

  const stream = await navigator.mediaDevices.getUserMedia({
    'audio': false,
    'video': {
      facingMode: 'user',
      width: videoWidth,
      height: videoHeight,
    },
  });
  video.srcObject = stream;

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}

async function loadVideo() {
  const video = await setupCamera();
  video.play();

  return video;
}

const defaultPoseNetArchitecture = 'MobileNetV1';
const defaultQuantBytes = 2;
const defaultMultiplier = 1.0;
const defaultStride = 16;
const defaultInputResolution = 200;

const guiState = {
  avatarSVG: Object.keys(avatarSvgs)[0],
  debug: {
    showDetectionDebug: true,
    showIllustrationDebug: false,
  },
};

/**
 * Sets up dat.gui controller on the top-right of the window
 */
function setupGui(cameras) {

  if (cameras.length > 0) {
    guiState.camera = cameras[0].deviceId;
  }

  const gui = new dat.GUI({width: 300});

  let multi = gui.addFolder('Image');
  gui.add(guiState, 'avatarSVG', Object.keys(avatarSvgs)).onChange(() => parseSVG(avatarSvgs[guiState.avatarSVG]));
  multi.open();

  let output = gui.addFolder('Debug control');
  output.add(guiState.debug, 'showDetectionDebug');
  output.add(guiState.debug, 'showIllustrationDebug');
  output.open();
  
}

/**
 * Sets up a frames per second panel on the top-left of the window
 */
function setupFPS() {
  stats.showPanel(0);  // 0: fps, 1: ms, 2: mb, 3+: custom
  document.getElementById('main').appendChild(stats.dom);
}


/**
 * Feeds an image to posenet to estimate poses - this is where the magic
 * happens. This function loops with a requestAnimationFrame method.
 */
function detectPoseInRealTime(video) {
  const canvas = document.getElementById('output');
  const videoCtx = canvas.getContext('2d');

  const keypointCanvas = document.getElementById('keypoints');
  const keypointCtx = keypointCanvas.getContext('2d');

  const illCanvas = document.getElementById('ill');
  const illCtx = illCanvas.getContext('2d');
  illCanvas.width = canvasWidth;
  illCanvas.height= canvasHeight;

  canvas.width = videoWidth;
  canvas.height = videoHeight;
  keypointCanvas.width = videoWidth;
  keypointCanvas.height = videoHeight;

  async function poseDetectionFrame() {
    // Begin monitoring code for frames per second
    stats.begin();

    let poses = [];
   
    videoCtx.clearRect(0, 0, videoWidth, videoHeight);
    // Draw video
    videoCtx.save();
    videoCtx.scale(-1, 1);
    videoCtx.translate(-videoWidth, 0);
    videoCtx.drawImage(video, 0, 0, videoWidth, videoHeight);
    videoCtx.restore();


    if (timeLimit % 10 == 0) {
	    printLimit = timeLimit / 10;
    }
    videoCtx.font = fontLayout;
    videoCtx.fillStyle = "blue";
    videoCtx.fillText(printLimit, 20, 50);
    videoCtx.fill();

    illCtx.font = fontLayout;
    illCtx.fillStyle = "red";
    illCtx.fillText(score, 150, 70);
    illCtx.fill();

    timeLimit -= 1;
    if(timeLimit <= 0){
        timeLimit = 0;
    }

    // Creates a tensor from an image
    const input = tf.browser.fromPixels(canvas);
    faceDetection = await facemesh.estimateFaces(input, false, false);
    let all_poses = await posenet.estimatePoses(video, {
      flipHorizontal: true,
      decodingMethod: 'multi-person',
      maxDetections: 1,
      scoreThreshold: minPartConfidence,
      nmsRadius: nmsRadius
    });

    poses = poses.concat(all_poses);
    input.dispose();

    keypointCtx.clearRect(0, 0, videoWidth, videoHeight);
    illCtx.clearRect(0, 0, canvasWidth, canvasHeight);


    if (guiState.debug.showDetectionDebug) {
      poses.forEach(({score, keypoints}) => {
      if (score >= minPoseConfidence) {
          drawKeypoints(keypoints, minPartConfidence, keypointCtx);
          drawSkeleton(keypoints, minPartConfidence, keypointCtx);
          drawWristPoint(keypoints[9], keypointCtx); //Left hand wrist
          //drawWristPoint(keypoints[10],keypointCtx); //Right hand wrist
          ballsDecision(illCtx, [keypoints[9]]); //,keypoints[10]]);
          //ballsDecision(illCtx, [keypoints[9],keypoints[10]], 3, "🤩");
          //ballsCheck(keypointCtx, [keypoints[9],keypoints[10]]);
          ballsDecision(keypointCtx,[keypoints[9]]); //,keypoints[10]]);
        }
      });
      faceDetection.forEach(face => {
        Object.values(facePartName2Index).forEach(index => {
            let p = face.scaledMesh[index];
            drawPoint(keypointCtx, p[1], p[0], 2, 'red');
            setStatusText(keypointCtx);
        });
      });
    }

    canvasScope.project.clear();

    if (poses.length >= 1 && illustration) {
      Skeleton.flipPose(poses[0]);

      if (faceDetection && faceDetection.length > 0) {
        let face = Skeleton.toFaceFrame(faceDetection[0]);
        illustration.updateSkeleton(poses[0], face);
      } else {
        illustration.updateSkeleton(poses[0], null);
      }
      illustration.draw(canvasScope, videoWidth, videoHeight);

      if (guiState.debug.showIllustrationDebug) {
        illustration.debugDraw(canvasScope);
      }
    }

    canvasScope.project.activeLayer.scale(
      canvasWidth / videoWidth, 
      canvasHeight / videoHeight, 
      new canvasScope.Point(0, 0)
    );

    // End monitoring code for frames per second

    let KEYPOINTS = [
      'nose', //0
      'left_eye', //1
      'right_eye', //2
      'left_ear', //3
      'right_ear', //4
      'left_shoulder', //5
      'right_shoulder', //6
      'left_elbow', //7
      'right_elbow', //8
      'left_wrist', //9
      'right_wrist', //10
      'left_hip', //11
      'right_hip', //12
      'left_knee', //13
      'right_knee', //14
      'left_ankle', //15
      'right_ankle' //16
    ]
    //console.log(poses[0].keypoints[0]); // nose
    //console.log(poses[0].keypoints[9]); // leftwrist
    //console.log(poses[0].keypoints[10]); // rightwrist

    //let handsup = false;
    //let squat  = false;
    let move = 0;
    if (poses.length > 0 && poses[0].keypoints != undefined){
      if (poses[0].keypoints[0].score > th &&
        (poses[0].keypoints[9].score > th ||
          poses[0].keypoints[10].score > th)) move = 1; //face touch

/**
      if (poses[0].keypoints[0].score > th &&
         (poses[0].keypoints[9] < poses[0].keypoints[0] &&
          poses[0].keypoints[10] < poses[0].keypoints[0])) move = 2;
      if (poses[0].keypoints[9].point[1] < poses[0].keypoints[0].point[1] &&
         poses[0].keypoints[10].point[1] < poses[0].keypoints[0].point[1]) move = 2;
**/
      if (poses[0].keypoints[0].score > th &&
        (poses[0].keypoints[7].score > th &&
        poses[0].keypoints[8].score > th)) move = 2; //hands up

      if (poses[0].keypoints[0].score > th &&
          poses[0].keypoints[10].score > th) move =4;

      if (poses[0].keypoints[0].score > th &&
          poses[0].keypoints[9].score > th) move =5;
/**
      if (poses[0].keypoints[12].score > th &&
        poses[0].keypoints[10].score > th) move = 4; //right
      if (poses[0].keypoints[11].score > th &&
        poses[0].keypoints[9].score > th) move = 5; //left
**/
      if (move != 0) {
          onfire(move);
          console.log(move);
          /**
          if (move === 2) {
            countbox.innerHTML = parseInt(countbox.innerHTML) + 1;
            console.log(countbox.innerHTML);
          }
          if (countbox.innerHTML % 1000 == 0) {
            $("#all").css('background-color','orange');

            Http.open("GET", led_url + "/on");
            Http.send();
            Http.onreadystatechange = (e) => {
              console.log(Http.responseText)
            }

          } else if (countbox.innerHTML % 100 == 0) {
            $("#all").css('background-color','yellow');

            Http.open("GET", led_url + "/off");
            Http.send();
            Http.onreadystatechange = (e) => {
              console.log(Http.responseText)
            }
          }
          */
      }
    }

    stats.end();

    requestAnimationFrame(poseDetectionFrame);
  }

  poseDetectionFrame();
}



function setupCanvas() {
  mobile = isMobile();
  if (mobile) {
    canvasWidth = Math.min(window.innerWidth, window.innerHeight);
    canvasHeight = canvasWidth;
    videoWidth *= 0.7;
    videoHeight *= 0.7;
  }  

  canvasScope = paper.default;
  let canvas = document.querySelector('.illustration-canvas');;
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  canvasScope.setup(canvas);

}

/**
 * Kicks off the demo by loading the posenet model, finding and loading
 * available camera devices, and setting off the detectPoseInRealTime function.
 */
export async function bindPage() {
  setupCanvas();

  toggleLoadingUI(true);
  setStatusText('Loading PoseNet model...');
  posenet = await posenet_module.load({
    architecture: defaultPoseNetArchitecture,
    outputStride: defaultStride,
    inputResolution: defaultInputResolution,
    multiplier: defaultMultiplier,
    quantBytes: defaultQuantBytes
  });
  setStatusText('Loading FaceMesh model...');
  facemesh = await facemesh_module.load();

  setStatusText('Loading Avatar file...');
  let t0 = new Date();
  await parseSVG(Object.values(avatarSvgs)[0]);

  setStatusText('Setting up camera...');
  try {
    video = await loadVideo();
  } catch (e) {
    let info = document.getElementById('info');
    info.textContent = 'this device type is not supported yet, ' +
      'or this browser does not support video capture: ' + e.toString();
    info.style.display = 'block';
    throw e;
  }

  setupGui([], posenet);
  setupFPS();
  
  toggleLoadingUI(false);
  detectPoseInRealTime(video, posenet);
}

navigator.getUserMedia = navigator.getUserMedia ||
    navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
FileUtils.setDragDropHandler((result) => {parseSVG(result)});

async function parseSVG(target) {
  let svgScope = await SVGUtils.importSVG(target /* SVG string or file path */);
  let skeleton = new Skeleton(svgScope);
  illustration = new PoseIllustration(canvasScope);
  illustration.bindSkeleton(skeleton, svgScope);
  let avatarName = target.split('.')[0];
  console.log(avatarName);
  if (avatarName == "/miku") {
    icon = "❤️";
    goal = "アイドルの道へ";
    obj  = "ハート";
  } else if (avatarName == "/hyuma") {
    icon = "⚾️";
    goal = "巨人の星へ";
    obj  = "ボール";
  } else if (avatarName == "/girl") {
    icon = "⭐️";
    goal = "スターの道へ";
    obj  = "星";
  } else if (avatarName == "/boy") {
    icon = "★"; //"●★";
    goal = "スターの道へ";
    obj  = "星";
  } else {
    icon = "●";
    goal = "ゴールへ";
    obj  = "ボール";
  }
  //headerMsg.innerHTML = goal;
  countMsg.innerHTML = obj+"をつかんでリハビリ!";
}
    
bindPage();


var alerting = false;
const Http = new XMLHttpRequest();
let move_str="";
// sound effect from https://maoudamashii.jokersounds.com/list/se2.html
// var sound = new Audio("https://qurihara.github.io/crosstalk-breaker/sound/se_maoudamashii_onepoint13.mp3");
var sound = new Audio("https://qurihara.github.io/crosstalk-breaker/sound/se_maoudamashii_onepoint28.mp3");

function onfire(move){
    if (alerting == true) {
      //console.log("stil alerting");
      return;
    }
    alerting = true;
    if (move == 1) {
      //$("#all").css('background-color','red');
      move_str = "/rgt";
    } else if (move == 2) {
      //$("#all").css('background-color','yellow');
      countMsg.innerHTML = obj+" ゲット！！"; //⭐️parseInt(countbox.innerHTML) + 1;
      //$("#all").css('background-image', 'url("http://blog.ktrips.net/wp-content/uploads/2024/09/hoshi_yellow.png")'); //./hoshi_high.jpg)');
//linear-gradient(rgba(0, 0, 255, 0.5), rgba(255, 255, 0, 0.5)), url("./heart_point.jpg")');
      move_str = "/str";
    } else if (move == 3) {
      //$("#all").css('background-color','green');
      move_str = "/dash";
    } else if (move == 4) {
      //$("#all").css('background-color','lightblue');
      countMsg.innerHTML = "Turn Right!"; //parseInt(countbox.innerHTML) + 1;
      move_str = "/rgt";
    } else if (move == 5) {
      //$("#all").css('background-color','pink');
      countMsg.innerHTML = "Turn Left!"; //parseInt(countbox.innerHTML) + 1;
      move_str = "/lft";
    }
    /**
    if (wfurl != ''){
      Http.open("GET", wfurl + move_str);
      Http.send();
      Http.onreadystatechange = (e) => {
        console.log(Http.responseText)
      }
      Http.open("GET", wfurl2 + move_str);
      Http.send();
      Http.onreadystatechange = (e) => {
        console.log(Http.responseText)
      }
    } **/

    /**
    let mute = $("#mute").prop("checked");
    if (mute == false){
      if (sound){
        sound.play();
      }
    } */

    setTimeout(function(){
      //$("#all").css('background-color','white');
      //$("#all").css('background-image', '');
      countMsg.innerHTML = obj+"をつかんでリハビリ!"; //⭐️parseInt(countbox.innerHTML) + 1;
      alerting = false;
    },1000);
//   }
}

/**
$("#start-buttonTest").click(function(){
  onfire();
});
window.onload = function() {
  var cookie = $.cookie('webhookurl');
  if(cookie){
    console.log(cookie);
    $('#webhookurl').val(cookie);
  }else{
//     console.log("no cookie");
  }

}

$("#webhookbutton").click(function(){
  wfurl = $('#webhookurl').val()
  console.log(wfurl);
  if (wfurl != ''){
    $.cookie('webhookurl',wfurl);
  }else{
    console.log("no url");
  }
  $('#webhookurl').prop('disabled', true);
  $('#webhookbutton').prop('disabled', true);
});
**/
