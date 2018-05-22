(function() {
	//exclude older browsers by the features we need them to support
	//and legacy opera explicitly so we don't waste time on a dead browser
	if (!document.querySelectorAll
		|| !('draggable' in document.createElement('span'))
		|| window.opera
	) { return; }

	/*page = {
		title: "t",
		targets: "ts",
		target: {
			title: "t",
			items: "i",
			item: {
				title: "t",
				content: "c"
			}
		}
	};
	var page = {
		title: null,
		targets: [{
			title: null,
			items: [{
				title: null,
				content: null
			}]
		}]
	}*/

	//get the collection of draggable targets and add their draggable attribute
	for (var
		targets = document.querySelectorAll('[data-draggable="target"]'),
		len = targets.length,
		i = 0; i < len; i++
	) {
		targets[i].setAttribute('aria-dropeffect', 'none');
	}

	//get the collection of draggable items and add their draggable attributes
	for (var
		items = document.querySelectorAll('[data-draggable="item"]'),
		len = items.length,
		i = 0; i < len; i++
	) {
		items[i].setAttribute('draggable', 'true');
		items[i].setAttribute('aria-grabbed', 'false');
		items[i].setAttribute('tabindex', '0');
	}

	//get the collection of draggable positions and add their draggable attribute
	for (var
		positions = document.querySelectorAll('[data-draggable="position"]'),
		len = positions.length,
		i = 0; i < len; i++
	) {
		positions[i].setAttribute('aria-dropeffect', 'none');
	}

	var selections = {
		items	  : [], //currently selected items
		owner	  : null, //reference to the selected items' owning container
		droptarget : null, //reference to the current drop target container
		dropposition : null //reference to the current drop position
	};

	//function for selecting an item
	function addSelection(item) {
		//if the owner reference is still null, set it to this item's parent
		//so that further selection is only allowed within the same container
		if (!selections.owner) {
			selections.owner = item.parentNode;
		}
		//or if that's already happened then compare it with this item's parent
		//and if they're not the same container, return to prevent selection
		else if (selections.owner != item.parentNode) {
			return;
		}
		item.setAttribute('aria-grabbed', 'true');
		selections.items.push(item);
	}

	//function for unselecting an item
	function removeSelection(item) {
		item.setAttribute('aria-grabbed', 'false'); //reset this item's grabbed state

		//then find and remove this item from the existing items array
		for (var len = selections.items.length, i = 0; i < len; i++) {
			if (selections.items[i] == item) {
				selections.items.splice(i, 1);
				break;
			}
		}
	}

	//function for resetting all selections
	function clearSelections() {
		if (selections.items.length) { //if we have any selected items
			selections.owner = null; //reset the owner reference

			//reset the grabbed state on every selected item
			for (var len = selections.items.length, i = 0; i < len; i++) {
				selections.items[i].setAttribute('aria-grabbed', 'false');
			}
			selections.items = [];
		}
	}

	//shortcut function for testing whether a multiple selection modifier is pressed
	function hasModifier(e) {
		return (e.ctrlKey || e.metaKey || e.shiftKey);
	}

	/*function isPositionFree (position) {
		for (var len = selections.items.length, i = 0; i < len; i++) {
			if (position == selections.items[i].previousElementSibling)
				return false;
		}
		return true;
	}*/


	//function for applying dropeffect to the target containers
	function addDropeffects() {
		//apply aria-dropeffect and tabindex to all targets apart from the owner
		for (var len = targets.length, i = 0; i < len; i++) {
			if (targets[i] != selections.owner && targets[i].getAttribute('aria-dropeffect') == 'none') {
				targets[i].setAttribute('aria-dropeffect', 'move');
				targets[i].setAttribute('tabindex', '0');
			}
		}
		//apply aria-dropeffect and tabindex to all positions
		for (var len = positions.length, i = 0; i < len; i++) {
			if (/*isPositionFree(positions[i]) &&*/ positions[i].getAttribute('aria-dropeffect') == 'none') {
				positions[i].setAttribute('aria-dropeffect', 'move');
				positions[i].setAttribute('tabindex', '0');
			}
		}
		//remove aria-grabbed and tabindex from all items inside those containers
		for (var len = items.length, i = 0; i < len; i++) {
			if (items[i].parentNode != selections.owner && items[i].getAttribute('aria-grabbed')) {
				items[i].removeAttribute('aria-grabbed');
				items[i].removeAttribute('tabindex');
			}
		}
	}

	//function for removing dropeffect from the target containers
	function clearDropeffects() {
		if (selections.items.length) { //if we have any selected items
			//reset aria-dropeffect and remove tabindex from all targets
			for (var len = targets.length, i = 0; i < len; i++) {
				if (targets[i].getAttribute('aria-dropeffect') != 'none') {
					targets[i].setAttribute('aria-dropeffect', 'none');
					targets[i].removeAttribute('tabindex');
				}
			}
			//reset aria-dropeffect and remove tabindex from all positions
			for (var len = positions.length, i = 0; i < len; i++) {
				if (positions[i].getAttribute('aria-dropeffect') != 'none') {
					positions[i].setAttribute('aria-dropeffect', 'none');
					positions[i].removeAttribute('tabindex');
				}
			}
			//restore aria-grabbed and tabindex to all selectable items
			//without changing the grabbed value of any existing selected items
			for (var len = items.length, i = 0; i < len; i++) {
				if (!items[i].getAttribute('aria-grabbed')) {
					items[i].setAttribute('aria-grabbed', 'false');
					items[i].setAttribute('tabindex', '0');
				}
				else if (items[i].getAttribute('aria-grabbed') == 'true') {
					items[i].setAttribute('tabindex', '0');
				}
			}
		}
	}

	//shortcut function for identifying an event element's target container
	function getContainer(element) {
		do {
			if (element.nodeType == 1 && element.getAttribute('aria-dropeffect')) {
				return element;
			}
		} while (element = element.parentNode);
		return null;
	}

	// function for grabbing an item by grabbing its content
	function makeChildDraggable(node) {
		if (node.getAttribute('draggable')) {
			return node;
		} else if (node.parentNode.getAttribute('draggable')) {
			return node.parentNode;
		}
		return node;
	}

	//mousedown event to implement single selection
	document.addEventListener('mousedown', function(e) {
		let etarget = makeChildDraggable(e.target);
		if (etarget.getAttribute('draggable')) { //if the element is a draggable item
			clearDropeffects();
			if (!hasModifier(e) && etarget.getAttribute('aria-grabbed') == 'false') {
				clearSelections();
				addSelection(etarget);
			}
		} else if (!hasModifier(e)) { //else [if the element is anything else] and the modifier is not pressed
			clearDropeffects();
			clearSelections();
		} else { //else [if the element is anything else and the modifier is pressed]
			clearDropeffects();
		}
	}, false);

	//mouseup event to implement multiple selection
	document.addEventListener('mouseup', function(e) {
		let etarget = makeChildDraggable(e.target);
		if (etarget.getAttribute('draggable') && hasModifier(e)) { // draggable item and multipler selection modifier pressed
			if (etarget.getAttribute('aria-grabbed') == 'true') { // if the item is grabbed
				removeSelection(etarget); //unselect this item
				if (!selections.items.length) { //if that was the only selected item
					selections.owner = null; // reset the owner container reference
				}
			} else { // if the item is not grabbed
				addSelection(etarget);
			}
		}
	}, false);

	//dragstart event to initiate mouse dragging
	document.addEventListener('dragstart', function(e) {
		//if the element's parent is not the owner, then block this event
		if (selections.owner != e.target.parentNode) {
			e.preventDefault();
			return;
		}

		//[else] if the multiple selection modifier is pressed and the item is not grabbed
		if (hasModifier(e) && e.target.getAttribute('aria-grabbed') == 'false') {
			addSelection(e.target); //add this additional selection
		}

		//we don't need the transfer data, but we have to define something
		//otherwise the drop action won't work at all in firefox
		//most browsers support the proper mime-type syntax, eg. "text/plain"
		//but we have to use this incorrect syntax for the benefit of IE10+
		e.dataTransfer.setData('text', '');
		addDropeffects(); //apply dropeffect to the target containers
	}, false);


	//keydown event to implement selection and abort
	document.addEventListener('keydown', function(e) {
		if (e.target.getAttribute('aria-grabbed')) { //if the element is a grabbable item
			if (e.keyCode == 32) { //Space is the selection or unselection keystroke
				if (hasModifier(e)) { //if the multiple selection modifier is pressed
					if (e.target.getAttribute('aria-grabbed') == 'true') { //if the item is grabbed
						//if this is the only selected item, clear dropeffect
						//from the target containers, which we must do first
						//in case subsequent unselection sets owner to null
						if (selections.items.length == 1) {
							clearDropeffects();
						}
						removeSelection(e.target); //unselect this item
						if (selections.items.length) { //if we have any selections
							//apply dropeffect to the target containers,
							//in case earlier selections were made by mouse
							addDropeffects();
						}
						if (!selections.items.length) { //if that was the only selected item
							selections.owner = null; // reset the owner container reference
						}
					} else { // if the item is not grabbed
						addSelection(e.target); // grab it (put into selected items)
						addDropeffects(); //apply dropeffect to the target containers
					}
				}
				else if (e.target.getAttribute('aria-grabbed') == 'false') { // !hasModifier(e)
					clearDropeffects();
					clearSelections();
					addSelection(e.target);
					addDropeffects();
				}
				else { //if modifier is not pressed and grabbed is already true]
					addDropeffects();
				}
				e.preventDefault(); //to avoid any conflict with native actions
			}
			//Modifier + M is the end-of-selection keystroke
			if (e.keyCode == 77 && hasModifier(e)) {
				if (selections.items.length) { //if we have any selected items
					//apply dropeffect to the target containers
					//in case earlier selections were made by mouse
					addDropeffects();

					//if the owner container is the last one, focus the first one
					if (selections.owner == targets[targets.length - 1]){
						targets[0].focus();
					} else { //else [if it's not the last one], find and focus the next one
						for (var len = targets.length, i = 0; i < len; i++) {
							if (selections.owner == targets[i]) {
								targets[i + 1].focus();
								break;
							}
						}
					}
				}
				e.preventDefault(); //to avoid any conflict with native actions
			}
		}
		//Escape is the abort keystroke (for any target element)
		if (e.keyCode == 27) {
			if (selections.items.length) { //if we have any selected items
				clearDropeffects();
				//set focus back on the last item that was selected, which is
				//necessary because we've removed tabindex from the current focus
				selections.items[selections.items.length - 1].focus();
				clearSelections();
				//but don't prevent default so that native actions can still occur
			}
		}
	}, false);

	//related variable is needed to maintain a reference to the
	//dragleave's relatedTarget, since it doesn't have e.relatedTarget
	var related = null;

	//dragenter event to set that variable
	document.addEventListener('dragenter', function(e) {
		related = e.target;
	}, false);

	//dragleave event to maintain target highlighting using that variable
	document.addEventListener('dragleave', function(e) {
		var droptarget = getContainer(related); //get a drop target reference from the relatedTarget
		if (related.nodeType == 1 && related.getAttribute("data-draggable") == "position") {
			if (selections.dropposition != related) {
				if (selections.dropposition) {
					selections.dropposition.className = selections.dropposition.className.replace(/ dragover/g, '');
				}
				related.className += ' dragover';
				selections.dropposition = related;
				droptarget = null;
			}
		} else {
			if (selections.dropposition) {
				selections.dropposition.className = selections.dropposition.className.replace(/ dragover/g, '');
			}
			selections.dropposition = null;
		}
		if (droptarget == selections.owner) { //if the target is the owner then it's not a valid drop target
			droptarget = null;
		}
		//if the drop target is different from the last stored reference
		//(or we have one of those references but not the other one)
		if (droptarget != selections.droptarget) {
			if (selections.droptarget) { //if we have a saved reference, clear its existing dragover class
				selections.droptarget.className = selections.droptarget.className.replace(/ dragover/g, '');
			}
			if (droptarget) { //apply the dragover class to the new drop target reference
				droptarget.className += ' dragover';
			}
			selections.droptarget = droptarget; //then save that reference for next time
		}
	}, false);

	//dragover event to allow the drag by preventing its default
	document.addEventListener('dragover', function(e) {
		if (selections.items.length) { //if we have any selected items, allow them to be dragged
			e.preventDefault();
		}
	}, false);

	//dragend event to implement items being validly dropped into targets or positions,
	//or invalidly dropped elsewhere, and to clean-up the interface either way
	document.addEventListener('dragend', function(e) {
		//if we have a valid drop target reference (which implies that we have some selected items)
		if (selections.droptarget) {
			//append the selected items to the end of the target container
			for (var len = selections.items.length, i = 0; i < len; i++) {
				let iNES = selections.items[i].nextElementSibling;
				selections.droptarget.appendChild(iNES);
				selections.droptarget.insertBefore(selections.items[i], iNES);
			}
			e.preventDefault(); //prevent default to allow the action
		}
		//if we have a valid drop position reference (which implies that we have some selected items)
		if (selections.dropposition) {
			//append the selected items to the selected position
			for (var len = selections.items.length, i = 0; i < len; i++) {
				let iPES = selections.items[i].previousElementSibling;
				selections.dropposition.parentNode.insertBefore(selections.items[i], selections.dropposition);
				selections.dropposition.parentNode.insertBefore(iPES, selections.items[i]);
			}
			e.preventDefault(); //prevent default to allow the action
		}

		if (selections.items.length) { //if we have any selected items
			clearDropeffects();
			if (selections.droptarget) { //if we have a valid drop target reference
				clearSelections();
				//reset the target's dragover class
				selections.droptarget.className = selections.droptarget.className.replace(/ dragover/g, '');
				selections.droptarget = null; //reset the target reference
			}
			if (selections.dropposition) { //if we have a valid drop position reference
				clearSelections();
				selections.dropposition.className = selections.dropposition.className.replace(/ dragover/g, '');
				selections.dropposition = null; //reset the position reference
			}
		}
	}, false);

	//keydown event to implement items being dropped into targets
	document.addEventListener('keydown', function(e) {
		//if the element is a drop target container
		if (e.target.getAttribute('aria-dropeffect')) {
			//Enter or Modifier + M is the drop keystroke
			if (e.keyCode == 13 || (e.keyCode == 77 && hasModifier(e))) {
				//append the selected items to the end of the target container
				if (e.target.getAttribute("data-draggable") == "position") {
					for (var len = selections.items.length, i = 0; i < len; i++) {
						let iPES = selections.items[i].previousElementSibling;
						e.target.parentNode.insertBefore(selections.items[i], e.target);
						e.target.parentNode.insertBefore(iPES, selections.items[i]);
					}
				} else {
					for (var len = selections.items.length, i = 0; i < len; i++) {
						let iNES = selections.items[i].nextElementSibling;
						e.target.appendChild(iNES);
						e.target.insertBefore(selections.items[i], iNES);
					}
				}
				clearDropeffects();
				//set focus back on the last item that was selected, which is
				//necessary because we've removed tabindex from the current focus
				selections.items[selections.items.length - 1].focus();
				clearSelections();
				e.preventDefault(); //to avoid any conflict with native actions
			}
		}
	}, false);


	var defaultText = null;
	function defaultLanguage(lang) {
		switch (lang) {
			case "FR":
				defaultText = {
					memotitle: "Titre de liste",
					itemtitle: "Titre de l'élément",
					itemcontent: "Du contenu ou une description",
					additem: "Ajouter un élément"
				}
				break;
			case "EN":
			default:
				defaultText = {
					memotitle: "List title",
					itemtitle: "Item title",
					itemcontent: "Some description or content",
					additem: "Add item"
				}
		}
	}
	defaultLanguage();

	/* Function to easily add component */
	function appendChildAddContentToNode(node) {
		let addcontent = document.createElement("div");
		addcontent.className = "add-content";
		addcontent.appendChild(document.createTextNode("✏"));
		node.appendChild(addcontent);
	}

	function appendChildItemToNode(target) {
		let item = document.createElement("li");
		item.setAttribute("data-draggable","item");

		let itemtitle = document.createElement("span");
		itemtitle.className = "item-title";
		itemtitle.appendChild(document.createTextNode(defaultText.itemtitle));

		let closeitem = document.createElement("div");
		closeitem.className = "close-item";
		closeitem.appendChild(document.createTextNode("╳"));

		item.appendChild(closeitem);
		appendChildAddContentToNode(item);
		item.appendChild(itemtitle);
		target.appendChild(item);

		item.setAttribute('draggable', 'true');
		item.setAttribute('aria-grabbed', 'false');
		item.setAttribute('tabindex', '0');

		let itemposition = document.createElement("li");
		itemposition.setAttribute("data-draggable","position");
		target.appendChild(itemposition);
		itemposition.setAttribute('aria-dropeffect', 'none');

		//items = document.querySelectorAll('[data-draggable="item"]');
	}

	function appendChildMemoListToNode(node) {
		let memolist = document.createElement("div");
		memolist.className = "memolist";

		let closememolist = document.createElement("div");
		closememolist.className = "close-memolist";
		closememolist.appendChild(document.createTextNode("╳"));

		let memotitle = document.createElement("span");
		memotitle.className = "memo-title";
		memotitle.appendChild(document.createTextNode(defaultText.memotitle));

		let target = document.createElement("ol");
		target.setAttribute("data-draggable","target");

		let additem = document.createElement("span");
		additem.className = "add-item";
		additem.appendChild(document.createTextNode(defaultText.additem));

		memolist.appendChild(closememolist);
		memolist.appendChild(memotitle);
		memolist.appendChild(target);
		memolist.appendChild(additem);
		node.appendChild(memolist);

		target.setAttribute('aria-dropeffect', 'none');
	}

	var currentInput = {
		node: null,
		content: ''
	};
	document.addEventListener('click', function(e) { //addItem(e) {
		if (e.target.className == "add-content") {
			let memolist = e.target.parentNode;

			let itemcontent = document.createElement("p");
			itemcontent.className = "item-content";
			itemcontent.appendChild(document.createTextNode(defaultText.itemcontent));

			memolist.appendChild(itemcontent);
			memolist.removeChild(e.target);
		}
		else if (e.target.className == "add-item") {
			let node = e.target.parentNode.querySelectorAll('[data-draggable="target"]')[0];
			appendChildItemToNode(node);
			items = document.querySelectorAll('[data-draggable="item"]');
			positions = document.querySelectorAll('[data-draggable="position"]');
		}
		else if (e.target.className == "add-list") {
			let main = document.getElementById("group");
 			appendChildMemoListToNode(main);
			targets = document.querySelectorAll('[data-draggable="target"]');
		}
		else if (e.target.className == "close-memolist" || e.target.className == "close-item") {
			let memolist = e.target.parentNode;
			if (e.target.className == "close-item") {
				memolist.parentNode.removeChild(memolist.nextElementSibling);
				items = document.querySelectorAll('[data-draggable="item"]');
				positions = document.querySelectorAll('[data-draggable="position"]');
			} else {
				targets = document.querySelectorAll('[data-draggable="target"]');
			}
			memolist.parentNode.removeChild(memolist);
		}

		else if ((e.target.className == "page-title"
				|| e.target.className == "memo-title"
				|| e.target.className == "item-title"
				|| e.target.className == "item-content")
				&& currentInput.node !== e.target)
		{
			let text = e.target.firstChild;//.style.display = "none";
			let input = null;
			if (e.target.className == "item-content") {
				input = document.createElement("textarea");
				input.value = text.data;
			} else {
				input = document.createElement("input");
				input.setAttribute("type", "text");
				input.setAttribute("value", text.data);
			}
			if (e.target.className == "item-title" || e.target.className == "item-content")
				e.target.parentNode.setAttribute('draggable', 'false');

			e.target.removeChild(text);
			e.target.appendChild(input);
			currentInput.node = e.target;
			currentInput.content = input.value;
		}
	}, false);


	function textFocus (e) {
		if (currentInput.node !== null && (e.target !== currentInput.node && e.target !== currentInput.node.firstChild)) {
			let input = currentInput.node.firstChild;
			let text = input.value;

			if (currentInput.node.className == "item-title" || currentInput.node.className == "item-content")
				currentInput.node.parentNode.setAttribute('draggable', 'true');

			if (text == ''){
				if (currentInput.node.className == "item-content") {
					appendChildAddContentToNode(currentInput.node.parentNode);
					currentInput.node.parentNode.removeChild(currentInput.node);
				}
				else {//if (currentInput.node.className == "item-title" || currentInput.node.className == "memo-title" || currentInput.node.className == "page-title") {
					currentInput.node.appendChild(document.createTextNode(currentInput.content));
					currentInput.node.removeChild(input);
				}
			} else {
				currentInput.node.appendChild(document.createTextNode(text));
				currentInput.node.removeChild(input);
			}

			currentInput.node = null;
			currentInput.content = '';
		}
	}
	document.addEventListener('mousedown', textFocus, false);
	document.addEventListener('keydown', textFocus, false);
	document.addEventListener('keyup', textFocus, false);

})();
