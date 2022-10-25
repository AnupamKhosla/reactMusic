import React from 'react';
import Input from './Input';
import { FaSearch } from 'react-icons/fa';
//import loading icon 
import { FaSpinner } from 'react-icons/fa';


class Search extends React.Component {
  constructor(props) {
    super(props);        
    this.handleSubmit = this.handleSubmit.bind(this);
    this.onClickToggle = this.onClickToggle.bind(this);
    this.darkenBg = this.darkenBg.bind(this);
    this.normalBg = this.normalBg.bind(this);
    this.disableLabel = this.disableLabel.bind(this);
    if(this.props.filterString !== "byname") {
      this.leftBtn = "active";
      this.rightBtn = "";
      this.placeHolder = "e.g. Australia";      
    }
    else {
      this.leftBtn = "";
      this.rightBtn = "active";
      this.placeHolder = "e.g. 90.7 fm";
    }

  }
  
  handleSubmit(event) {    
    let searchInputValue = document.getElementById("search").value.trim();    
    this.props.onChangeText(searchInputValue, event);
    document.activeElement.blur();  //On mobile phone, otherwise the keyboard remains open    
    event.preventDefault();    //stop form submission
  }
  onClickToggle(event) {    
    if(!this.props.loading && !event.target.classList.contains("active")) {
      //this code executes before state update and rerender. Without this active button moves only after fetch is complete
      //add active class on the clicked button
      let btns = document.querySelectorAll(".toggle-btns button");
      for(let i=0; i<btns.length; i++) {
        btns[i].classList.remove("active");
      }
      event.target.classList.add("active");
      //toggle class left on cover if not clicked on left
      let cover = document.querySelector(".cover");
      if(event.target.classList.contains("left")) {
        cover.classList.add("left");
        this.placeHolder = "e.g. Australia";        
      }
      else {        
        cover.classList.remove("left");
        this.placeHolder = "e.g. 90.7 fm";
        
      }  
      this.props.onClickToggleState(event);       
    } 
  }
  

  darkenBg(event) {    
    //add class darken to .toggle-btns, if mouseenter on not active button
    let target = event.target;
    if(!target.classList.contains("active")) {
      target.parentNode.classList.add("darken");
    }    
    else {
      target.parentNode.classList.add("darken-active");     
    }
    // event.stopPropagation();
  }
  normalBg(event) {
    //set background color of target to normal
    let target = event.target;
    if(!target.classList.contains("active")) {
      target.parentNode.classList.remove("darken");
    }    
    else {
      target.parentNode.classList.remove("darken-active");
    }
  }
  disableLabel(event) {  
    //if click came from a touch event, stop default action

    if(event.nativeEvent instanceof PointerEvent && event.nativeEvent.pointerType === 'touch') {      
      event.preventDefault();
    }  
    else {      
      event.preventDefault();
      //.3 seconds later focus in the input
      setTimeout(() => {
        document.getElementById("search").focus();
      }
      , 300); //300ms must be same as .3s transitions for the buttons   
    }     
  }

  //on component update
  componentDidUpdate() {    
    if(this.props.filterString !== "byname") {
      this.leftBtn = "active";
      this.rightBtn = "";
      this.placeHolder = "e.g. Australia";
    }
    else {
      this.leftBtn = "";
      this.rightBtn = "active";
      this.placeHolder = "e.g. 90.7 fm";      
    }
    console.log("form mount ", this.placeHolder);
  }

  //.left class is necessary on left btn 
  render (){    
    console.log("form re render ", this.placeHolder);
    return (      
      <form id="searchForm" onSubmit={this.handleSubmit}>
        <label htmlFor="search" className="label toggle-btns" onClick={this.disableLabel}>
          <span className={"cover " + (!!this.leftBtn ? "left " : "")}></span>
          <button type="button" className={"button is-rounded is-ghost left " + this.leftBtn } onClick={this.onClickToggle} onMouseEnter={this.darkenBg} onMouseLeave={this.normalBg}>
            Country
          </button>
          <button type="button" className={"button is-rounded is-ghost " + this.rightBtn } onClick={this.onClickToggle} onMouseEnter={this.darkenBg} onMouseLeave={this.normalBg}>
            Channel
          </button>            
        </label>
        <div className="control has-icons-right">
          <Input searchString={this.props.searchString} key={this.props.searchString} placeHolder={this.placeHolder}/>        
          <span tabIndex="0" className="icon is-medium is-right" onClick={() => document.getElementById("searchForm").requestSubmit()} >              
            {this.props.loading ? <FaSpinner className="fa-spin" /> : <FaSearch />}              
          </span>
        </div>
      </form>
    )
  }
}

export default Search;