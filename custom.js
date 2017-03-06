// v3.8.3
// Tested for v3.8
// Contributors: Steve Tuel, Nick Velich

// Add Manual Activity Support Group to Form v3.8.3 -- for Change Requests
app.custom.formTasks.add('ChangeRequest', null, function (formObj, viewModel) {
	formObj.boundReady(function(){
		if (session.user.Analyst) { 
			MA2SGF_addSupportGroupToMA();
		}
	});
	return;
});

// Add Manual Activity Support Group to Form v3.8.3 -- for Service Requests
app.custom.formTasks.add('ServiceRequest', null, function (formObj, viewModel) {
	formObj.boundReady(function(){
		if (session.user.Analyst) { 
			MA2SGF_addSupportGroupToMA();
		}
	});
	return;
});

// Add Manual Activity Support Group to Form v3.8.3 -- for Incidents
app.custom.formTasks.add('Incident', null, function (formObj, viewModel) {
	formObj.boundReady(function(){
		if (session.user.Analyst) {
			MA2SGF_addSupportGroupToMA();
		}
	});
	return;
});

// Add Manual Activity Support Group to Form v3.8.3 -- Get the Enum List containing MA Support Groups, and flatten it. Add event handler for all MAs
// to detect changes to the newly added Support Group field. Event handlers will walk the activity tree and update the particular MA of interest.
function MA2SGF_addSupportGroupToMA() {
    // Replace Support Group Extension Name/ID below if using a list other than Cireson's DevOps extension to MA Support Groups
	// Get-SCSMEnumeration -Name SupportGroup | Format-Table Name, Id
    var MASupportGroupEnumGuid = '188e5912-1031-dce2-08d3-c03c6a6f1b9e';

    var workItem = pageForm.viewModel;
		
	$.ajax({
		url: "/api/V3/Enum/GetFlatList",
		data: {Id: MASupportGroupEnumGuid, itemFilter: ""},
		type: "GET",
		success: function (data) {
			// The following line will remove the "blank" space option. Comment in/out as needed.
			data = data.splice(1,data.length);
			
			//Walks the activities and adds the drop down if needed
			if (workItem.Activity.length > 0) {
				var maActivities = [];

				_.delay(function () {
					// Navigate through nested layers of MAs, and add to one flat list of MAs. Nothing updated here.
					$.merge( maActivities, MA2SGF_WalkActivityTree(workItem.Activity, data, 'find'));
					
					for (var i = 0; i < maActivities.length; i++) {
					// Adds an event handler for the change of the new select list and sets the decision activity
						$('#group-selector[data-activity-id="' + maActivities[i] +'"]').change(function () {
							var id = this.dataset.activityId;
							var supportgroup = $('#group-selector[data-activity-id="' + id +'"]').val();

							// Navigate through nested layers of MAs, changing the corresponding MA. Updates happen here.
							MA2SGF_WalkActivityTree(workItem.Activity, data,'update', id, supportgroup);						
						});
					}				
				}, 1000);
			}
		}
	});
	
	// Add Manual Activity Support Group to Form v3.8.3 -- Recursively walk through the activity tree, which may contain many nested MAs. At each level,
	// the MA list is returned and merged with the list a level above, until ultimately one flat list exists. The 'type' flag is used to tell this function
	// that an activity will be updated along the way, in addition to returning the flattened MA list.
    function MA2SGF_WalkActivityTree(parent, data, type, id, sgid) {
        var maArray = [];
		
        for (var i = 0; i < parent.length; i++) {
            var activity = parent[i];
            var activities = activity.Activity;
            var className = activity.ClassName;
            var children = activities.length;

			// If the current activity has children, it must be a PA or SA, and we need to go a level deeper. Call the function again, and merge results.
			if (activities && children > 0) {
                $.merge(maArray, MA2SGF_WalkActivityTree(activities, data, type, id, sgid) );
            }
			// If we get here that means there are no children, but we must check to make sure this is an MA, and not an RA or RBA. Also, this if statement
			// will only be used when the type flag is set to "find"
            else if (className == "System.WorkItem.Activity.ManualActivity" && type =='find'){
                    //Adds the Support Group select box to the Manual Activity Form
                    MA2SGF_AddSelectBox(data, activity.Id, activity.SupportGroup.Id);
                    maArray.push(activity.Id);
              
            }
			// Still making sure its an MA, but this will be used for the "update" type flag. Also checks to make sure activity Id and selected id match.
			else if (className == "System.WorkItem.Activity.ManualActivity" && type == 'update' && activity.Id == id){		
				// The GetFlatList API call returns a blank value with the below guid. If this is set, we are essentially "clearing" the MA SG
				if(sgid == '00000000-0000-0000-0000-000000000000'){
					activity.SupportGroup.Id = "";
				}
				// Otherwise, an SG has been selected and we want to update
				else{
					activity.SupportGroup.Id = sgid;
				}
            }
        }
		
		// MA array of each level ultimately passed up a level in the recursion tree, and merged within this function.
        return maArray;
    }	
    
	// Add Manual Activity Support Group to Form v3.8.3 -- This function takes in an array of name/value pair objects and creates a select list
    function  MA2SGF_AddSelectBox(data, id, selected) {
        var div = $('<div></div>');
        var title = $('<div class="editor-label" style="padding-top: 10px;"><label><span>Support Group</span></label></div>')
        var dropdown = $('<div class="editor-field"  />');
        var list = $('<select id="group-selector" data-activity-id="' + id + '" />');
		
        // Find the particular form that we are working with, currently this is static
        var searchString = 'div[data-activity-id="' + id + '"]';
        var activityForm = $(searchString).parent().find('.activity-item-form');

		//Sets insert location after 'Description.' This can be modified to place the element elsewhere on the form.
        var insertLocation = (activityForm.children())[1]; 
        for (var item in data) {
            //Checks to see if a selection was passed into the function
            if (selected && selected == data[item].Id) {
                $('<option />', { value: data[item].Id, text: data[item].text }).attr('selected', 'selected').appendTo(list);
            }
        }

        list.appendTo(dropdown);
        title.appendTo(div);
        dropdown.appendTo(div);
        div.appendTo(insertLocation);
		var selectString = '#group-selector[data-activity-id="' + id +'"]';
		
		// Add some "Choose One..." flavour text if SG is not set
		if (selected == null) {
			$(selectString).kendoDropDownList({
				optionLabel: "Choose One...",
				dataTextField: "Name",
				dataValueField: "Id",
				dataSource: data
			});
		}
		else {
			$(selectString).kendoDropDownList({
				dataTextField: "Name",
				dataValueField: "Id",
				dataSource: data
			});
		}
    }
}