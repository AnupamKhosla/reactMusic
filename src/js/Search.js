import React from 'react';
import { FaSearch } from 'react-icons/fa';
//import loading icon 
import { FaSpinner } from 'react-icons/fa';


class Search extends React.Component {
  constructor(props) {
    super(props);
    this.applyInput = this.applyInput.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }
  applyInput(event) {    
    //get search input value
    let searchInputValue = document.getElementById("search").value;
    this.props.onChangeText(searchInputValue);
  }
  handleSubmit(event) {
    this.applyInput();
    //stop form submission
    event.preventDefault();
  }


  render (){
    return (      
        <form onSubmit={this.handleSubmit}>
          <label htmlFor="search" className="label">Country</label>
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