import React from 'react';
import { FaSearch } from 'react-icons/fa';
//import loading icon 
import { FaSpinner } from 'react-icons/fa';


class Search extends React.Component {
  constructor(props) {
    super(props);
    this.applyInput = this.applyInput.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.onClickToggle = this.onClickToggle.bind(this);
    this.darkenBg = this.darkenBg.bind(this);
    this.normalBg = this.normalBg.bind(this);
    this.disableLabel = this.disableLabel.bind(this);
  }
  applyInput(event) {    
    //get search input value
    let searchInputValue = document.getElementById("search").value;
    this.props.onChangeText(searchInputValue);
  }
  handleSubmit(event) {
    this.applyInput();
    document.activeElement.blur();  //On mobile phone, otherwise the keyboard remains open    
    event.preventDefault();    //stop form submission
  }
  onClickToggle(event) {
    this.props.onClickToggleState();
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
    }
    else {
      cover.classList.remove("left");
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
    event.preventDefault();    
    //.3 seconds later focus in the input
    setTimeout(() => {
      document.getElementById("search").focus();
    }
    , 300); //300ms must be same as .3s transitions for the buttons   
  }

  render (){
    return (      
        <form onSubmit={this.handleSubmit}>
          <label htmlFor="search" className="label toggle-btns" onClick={this.disableLabel}>
            <span className="cover left"></span>
            <button type="button" className="button is-rounded is-ghost active left" onClick={this.onClickToggle} onMouseEnter={this.darkenBg} onMouseLeave={this.normalBg}>
              Country
            </button>
            <button type="button" className="button is-rounded is-ghost" onClick={this.onClickToggle} onMouseEnter={this.darkenBg} onMouseLeave={this.normalBg}>
              Channel
            </button>            
          </label>
          <div className="control has-icons-right">
            <input name="search" id="search" className="input is-large" type="text" placeholder="e.g. Australia" />            
            <span tabIndex="0" className="icon is-medium is-right" onClick={this.applyInput} >              
              {this.props.loading ? <FaSpinner className="fa-spin" /> : <FaSearch />}              
            </span>
          </div>
        </form>
    )
  }
}

export default Search;