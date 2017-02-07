const Snap = require(`snapsvg`);

const constellation = function ({
	size = [400,400],
	element = undefined,
	nodeSize = 5,
	nodePadding = 2,
	nodesTotal = 30,
	shipsTotal = 70,
	fuzzyness = 100,
	padding = [0,0],
	speed = {
		active: .125,
		passive: .075
	},
	styles = {
		line: {
			stroke: '#000',
			strokeWidth: 1
		},
		star: {
			fill: '#000',
		}
	}
} = {}) {

	if(padding[0] === 0 && padding[1] === 0) {
		padding = [fuzzyness,fuzzyness]
	}

	let chunks = [];
	let connectedNodes = [];

	const repaint = (styles) => {
		$nodes.children().map(($child)=>{
			$child.attr(styles.star);
		});
		$lines.children().map(($child)=>{
			$child.attr(styles.line);
		});
		$nodes.attr(styles.starGroup);
		$lines.attr(styles.lineGroup);
	}

	const random = (arr) => {
		return arr[Math.floor(Math.random() * arr.length)];
	}

	const makeNode = (tries=500) => {
		let makeDimension = (coord) => {
			let localSize = (coord==='x')?size[0]:size[1];
			let localPadding = (coord==='x')?padding[0]:padding[1];
			return Math.ceil(
				Math.random()*(localSize - localPadding*2) + localPadding
			);
		}
		let node = [makeDimension('x'),makeDimension('y')];
		let chunk = JSON.stringify([
			Math.ceil(node[0]/size[0]*(size[0]/nodeSize/10)),
			Math.ceil(node[1]/size[1]*(size[1]/nodeSize/10))
		]);
		if(tries > 0 && chunks.indexOf(chunk) >= 0) {
			return makeNode(tries-1);
		}
		else {
			chunks.push(chunk);
			return node;
		}
	}

	const makeShip = (faves,force=false) => {
		let start,end;

		start = random(nodes);
		end = start.closest[random([0,1,2,3,4,5,6,7,8])];

		if(!force && connectedNodes.indexOf(start) > 0) {
			return makeShip(faves);
		}
		if(!force && connectedNodes.indexOf(end) > 0) {
			return makeShip(faves);
		}

		connectedNodes.push(JSON.stringify(start.position));
		connectedNodes.push(JSON.stringify(end.position));

		return start.position.concat(end.position);
	};

	let nodes = (() => {
		let nodes = [];
		for(let i = 0;i < nodesTotal;i++) {
			nodes.push({
				position: makeNode()
			});
		}
		nodes.map((node)=>{
			let distances = [];
			nodes.map((subnode)=>{
				let localDistance =
					Math.sqrt(
						Math.pow(node.position[0]-subnode.position[0],2)
						+
						Math.pow(node.position[1]-subnode.position[1],2)
					);
				if(localDistance < 0) localDistance = localDistance*-1;
				if(localDistance !== 0)  {
					distances.push({
						distance: localDistance,
						node: {
							position: [
								subnode.position[0],subnode.position[1]
							]
						}
					});
				}
			})
			distances.sort((a,b)=>{
				return a.distance - b.distance
			});
			let closest = [];
			distances.map((distance)=>{
				closest.push(distance.node);
			})
			node.closest = closest;
		});
		return nodes;
	})()

	let ships = (() => {
		let ships = [];
		let faves = [0,1,2];
		for(let i = 0;i < shipsTotal;i++) {
			ships.push(makeShip(faves));
		}
		return ships;
	})();

	let $nodeList = {};
	let $shipList = {
		start: {},
		end: {}
	};

	let $nodes,$lines,$clip;

	return new Promise((resolve,reject)=>{
		let start = () => {

			let snap;
			if(element) {
				snap = Snap(element);
				snap.attr({
					width: size[0],
					height: size[1]
				})
			}
			else {
				snap = Snap(size[0],size[1]);
			}

			$nodes = snap.g();
			$lines = snap.g();
			$clip = snap.g();

			$clip.rect(0,0,size[0],size[1]).attr({
				fill: '#fff'
			});

			let lastMouse = [0,0];

			window.$nodeList = $nodeList;
			window.$shipList = $shipList;

			nodes.map((node)=>{

				let pos = node.position[0]+','+node.position[1];
				let $node = $nodes.circle(node.position[0], node.position[1], nodeSize);
				let $clippingNode = $clip.circle(node.position[0], node.position[1], nodeSize+nodePadding);

				$node._previousTransform = [0,0];
				$node._jiggles = true;
				snap.mousemove((ev)=>{
					var x = ev.pageX - snap.node.offsetLeft +document.documentElement.scrollLeft;
					var y = ev.pageY - snap.node.offsetTop + document.documentElement.scrollTop;

					$node._jiggles = false;
					lastMouse = [x,y];
				});
				snap.mouseout(()=>{
					$node._jiggles = true;
				});

				$node._jiggle = [Math.random()*20 - 10,Math.random()*20 - 10];
				setInterval(()=>{
					$node._jiggle = [Math.random()*20 - 10,Math.random()*20 - 10];
				},5000);

				const fun = (callback) =>{

					let x = lastMouse[0];
					let y = lastMouse[1];
					let localSpeed = speed.active;

					if($node._jiggles) {
						localSpeed = speed.passive;
						x = node.position[0] + $node._jiggle[0],
						y = node.position[1] + $node._jiggle[1]
					}

					if(
						(x > node.position[0] - fuzzyness*1.1 && x < node.position[0] + fuzzyness*1.1)
						&&
						(y > node.position[1] - fuzzyness*1.1 && y < node.position[1] + fuzzyness*1.1)
					)
					{
						let fromCenter = {
							x: node.position[0]-x,
							y: node.position[1]-y
						}

						let displacement = {};

						displacement.y = 0;
						if(fromCenter.x > 0) {
							displacement.x = $node._previousTransform[0] + localSpeed - ($node._previousTransform[0]/fuzzyness)*localSpeed
						}
						else {
							displacement.x = $node._previousTransform[0] - localSpeed + ($node._previousTransform[0]*-1/fuzzyness)*localSpeed
						}
						if(fromCenter.y > 0) {
							displacement.y = $node._previousTransform[1] + localSpeed - ($node._previousTransform[1]/fuzzyness)*localSpeed
						}
						else {
							displacement.y = $node._previousTransform[1] - localSpeed + ($node._previousTransform[1]*-1/fuzzyness)*localSpeed
						}

						$node._previousTransform = [displacement.x,displacement.y];
						$node.attr({
							style: `transform: translateX(${$node._previousTransform[0]}px) translateY(${$node._previousTransform[1]}px)`
						});
						$clippingNode.attr({
							style: `transform: translateX(${$node._previousTransform[0]}px) translateY(${$node._previousTransform[1]}px)`
						});
						try {
							$shipList.end[pos].map(($line)=>{
								$line.attr({
									'x2': $line._originalPos[2]+displacement.x,
									'y2': $line._originalPos[3]+displacement.y,
								})
							})
						} catch(e){
							/*sometimes shiplist has no ships*/
						}
						try {
							$shipList.start[pos].map(($line)=>{
								$line.attr({
									'x1': $line._originalPos[0]+displacement.x,
									'y1': $line._originalPos[1]+displacement.y,
								})
							})
						} catch(e){
							/*sometimes shiplist has no ships*/
						}
					}

					requestAnimationFrame(()=>{
						fun();
					})
				};
				fun()
				$nodeList[pos] = $node;
			})

			ships.map((ship)=>{
				let startPos = ship[0]+','+ship[1];
				let endPos = ship[2]+','+ship[3];
				let line = $lines.line(ship[0],ship[1],ship[2],ship[3])

				line._originalPos = [ship[0],ship[1],ship[2],ship[3]];

				if(!$shipList.start[startPos]) $shipList.start[startPos] = [];
				if(!$shipList.end[endPos]) $shipList.end[endPos] = [];

				$shipList.start[startPos].push(line);
				$shipList.end[endPos].push(line);
			});

			$lines.attr({
				'mask':$clip
			});

			resolve({
				repaint: repaint,
				$constellation: snap,
				filter: Snap.filter
			});

		};
		if (/comp|inter|loaded/.test(document.readyState)){
			start();
		} else {
			window.document.addEventListener("DOMContentLoaded",start);
		}
	});

};

module.exports = () => {
	return constellation;
};
