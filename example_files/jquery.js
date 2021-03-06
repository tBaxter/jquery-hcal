/* CONFIG/ GLOBALS */

var dayNames = new Array("Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday");
var dayAbbrevs = new Array("S", "M", "T", "W", "T", "F", "S");
var monthNames = new Array ("January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December");
var monthLength = new Array(31,28,31,30,31,30,31,31,30,31,30,31);

var firstDayOfWeek = 0;
var DEBUG = 1;
var globalDateHash = new Object();
var month_tables =''
  
/************************************** helper functions ************************/
function debug(message) {
  if (DEBUG)
    console.log(message);
}

/* Trims the starting zero off of a number to ensure JS gets a regular int, not an octal */
function trimStartingZero(number) {
	number = (number + '');
	if (number.substring(0,1) == "0") {
		number = number.substring(1,number.length)
	}
	return parseInt(number);
}

function parseDT(dt) {
	/* Helper function to parse datetimes. 
		It will look first in the html5 time elements datetime attribute
		then in the title.
		It is looking for a standard timestamp: Y-m-d
		or if there is a time present: Y-m-dTH:iZ
		Example: 2009-11-13T20:30Z
	*/
	var dtText;
	var dtDate;
	var dtTime;
	
	if (dt.length > 0) { // Check element exists first
		dtText = dt.attr('datetime');
		if (!dtText) {
			dtText = dt.attr('title');
		}
		if (!dtText) {
			debug('could not find date')
			return
		}
		
		dtSplit = dtText.split('T')      //Split into date/time pair, in case time exists
		dtDate = dtSplit[0].split('-')
		if (dtDate == null) {
	    	debug("didn't recognize DT in: " + dtText);
			return
	  	}
	} else {
		debug('elem does not exist');
	}
	return [dtDate, dtTime];
}

// TODO deal with leap year
getMonthLength = function(year, month) {
  return monthLength[month - 1];
}
/*********************************************************************
**	First: check for abilities and readiness 
**	Second: find events (.vevent), process and add to globalDateHash
**	Third: make month tables and append to page 
**********************************************************************/
function findHCalendarEvents () {
  if (!(document.getElementById && document.createElement)) {
    debug("No DOM!");
    return;
  }
  if ($('.hcal_tables') == null) {  
    debug("calendar data not found!")
    return;
  }
  


  $('.vevent').each(function() {
		var startDate;
		var endDate;
		var eventHash = {
			summary     : $(this).find(".summary").html(),
			description : $(this).find(".description").html(),
			time        : $(this).find(".time").text(),
			location    : $(this).find(".location").text(),
		};
 	

	startDate = parseDT($(this).find(".dtstart"))[0]; 
	endDate   = parseDT($(this).find(".dtend"))[0];
	if (endDate == null) {
		endDate = startDate;
 	}
 	var startDay   = startDate[2];
 	var endDay    = endDate[2];

	// handle events that span months:
	// If event goes into next month, grab end of this month and add event until then.
	// If event starts in previous month, grab start of month and add event till end date.
	if ((startDate[0] < endDate[0]) || (endDate[0] > endDate[0])
			|| (startDate[1] < endDate[1]) || (endDate[1] > startDate[1])) {
		endDay = getMonthLength(startDate[0], startDate[1]);
		addEventHashToGlobalDateHash(eventHash, startDate, startDay, endDay);
		
		startDay = 1;
		endDay = parseInt(endDate[2]);
		addEventHashToGlobalDateHash(eventHash, endDate, startDay, endDay);
	} 
	//For events that are within a single month, just populate the event days normally.
	else {
		addEventHashToGlobalDateHash(eventHash, startDate, startDay, endDay);
	}
	return;  
  });
 
  for (year in globalDateHash) {
    for (month in globalDateHash[year]) {
      $('.hcal_tables').append(makeMonthTable(globalDateHash[year][month], year, month));
    }
  }
}


/**
 * Adds EventHash Object representing Event Data on a specific Day to the GlobalDateHash Object. 
 * If the startDateDay and endDateDay are not equal, the event will be added to all Days in between.
 */
function addEventHashToGlobalDateHash(eventHash, dateInfo, startDay, endDay) {
	// ParseDT returns an Array with three parts:
	// First [0] is the Year, Second [1] is the Month, Third [2] is the Day. 
	//  If the startDay is not equal to endDay, it's a multi-day event and we must loop through 
	// and add the event for each day in the span globalDateHash.
	for (var i = trimStartingZero(startDay); i <= trimStartingZero(endDay); i++) {
		// If the Year doesn't exist in the globalDateHash, add Object for it.
		if (globalDateHash[ dateInfo[0] ] == null) {
			globalDateHash[ dateInfo[0] ] = new Object();
		}
		// If the Month doesn't exist in the globalDateHash, add Object to represent it.
		if (globalDateHash[ dateInfo[0] ][ dateInfo[1] ] == null) {
			globalDateHash[ dateInfo[0] ][ dateInfo[1] ] = new Object();
		}
		// If the Day doesn't exist in the globaDateHash, add Array to store Events on this day.
		if (globalDateHash[ dateInfo[0] ][ dateInfo[1] ][ i ] == null) {
			globalDateHash[ dateInfo[0] ][ dateInfo[1] ][ i ] = new Array();
		}
		// Add this Event to the Array List of Events for this Day.
		globalDateHash[ dateInfo[0] ][ dateInfo[1] ][ i ].push(eventHash);
	}
}

//Create Table of the specified Month for the specified Year, with events. 
function makeMonthTable (monthHash, year, month) {
  currentMonthLength = getMonthLength(year, month);
  previousMonthLength = getMonthLength(year, month-1);
  var today = new Date;
  var todayYear = today.getFullYear();
  var todayMonth = today.getMonth() + 1;
  var todayDay = today.getDate();    
  var days = new Array(currentMonthLength+1); // We are going to index this array starting at 1.  Because I said so.
  
  // Create an HTML Table to Represent the Month and set necessary Attributes.
  var monthTable =  document.createElement('table');  
  $(monthTable).append('<caption>'+ monthNames[trimStartingZero(month)-1] + " " + year + '</caption>')
  
 // Create thead with rows for month/year, full day names and abbreviated day names
  var day_heds = '<tr class="longDays">';
  for (var i = 0; i < dayNames.length; i++) {
		day_heds += '<th scope="col" >' + dayNames[i] + '</th>';
	}
	day_heds += '</tr><tr class="abbrDays">';
	for (var i = 0; i < dayAbbrevs.length; i++) {
		day_heds += '<th scope="col" ><abbr title="' + dayNames[i] +'">' + dayAbbrevs[i] + '</abbr></th>';
	}
	$(monthTable).append('<thead>' + day_heds + '</tr></thead>')

  // create tbody and fill with days
  var tbody = document.createElement("tbody");
  $(monthTable).append(tbody);

  for (var i = 1; i <= currentMonthLength; i++) {
    days[i] = document.createElement('td');
    if (todayYear == year && todayMonth == month && todayDay == i) {
      days[i].className += ' calDayToday';
    }
    $(days[i]).append('<a href="/events/' + month +'/'+ i +'/'+ year +'/" class="calDayLabel">' + i + '</a>');
  }
  // populate days here
  for (var day in monthHash) {
    for (var i = 0; i < monthHash[day].length; i++) {
      dayTD = days[day-0];
      var eventString  = '<h3>' + monthHash[day][i].summary + '</h3> ';
      var eventDetails = '<div class="eventDetails"><p>' + $.trim(monthHash[day][i].time) + ' ' + 
      	$.trim(monthHash[day][i].location) +'</p>';
	/*if (monthHash[day][i].time) {
		eventString += '<span class="calEventTime">' + monthHash[day][i].time + '</span>';
	}
	if (monthHash[day][i].location) {
		eventString += '<span class="calEventLoc">' + monthHash[day][i].location + '</span>';
	}*/
	if (monthHash[day][i].description) {
		eventDetails += '<p class="calEventDesc">' + monthHash[day][i].description + '</p>';
	}
	eventDetails += '</div>';
	$(dayTD).addClass('has_events').append('<div class="event">' + eventString + eventDetails +'</div>');
    }
  }    
  var dateToCheck = new Date();
  dateToCheck.setYear(year);
  dateToCheck.setDate(1);
  dateToCheck.setMonth(month-1);
  var dayOfFirstOfMonth = dateToCheck.getDay();

  var row = tbody.appendChild(document.createElement("tr"));
  // Loop through empty Days before first Day of Month and fill with 'outOfRange' Cells.
	for (var i = 0; i < dayOfFirstOfMonth; i++) {
		$(row).append('<td class="outOfRange"><div class="calDayLabel"> ' + (previousMonthLength - (dayOfFirstOfMonth - i-1)) + '</div></td>');
	}
  
  for (var i = 1; i <= currentMonthLength; i++) {
    if (row.childNodes.length == 7) {
      row = tbody.appendChild(document.createElement("tr"));
    }
    if(row.childNodes.length == 0 ||row.childNodes.length == 6){
	$(days[i]).addClass('weekend');
	}	
    row.appendChild(days[i]);
  }
  // fill in next month's days to end
  newmonth = 1;
  while (row.childNodes.length < 7) {
      $(row).append('<td class="outOfRange"><div class="calDayLabel">' + newmonth + '</div></td>');
	newmonth++;
  }
  return monthTable;
}

$(document).ready(findHCalendarEvents);
