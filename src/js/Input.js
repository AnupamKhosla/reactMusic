import React from 'react';


class Input extends React.Component {
	constructor(props) {
    	super(props);   
  	  this.state = {
	    	inputValue: this.props.searchString
	  	};
		  this.handleChange = this.handleChange.bind(this);
	}

	handleChange(event) {
		this.setState({inputValue: event.target.value});
	}
	

	render() {
		
		return (
			 <input 
	        name="search" 
	        id="search" 
	        className="input is-large" 
	        type="text" 
	        placeholder="e.g. Australia" 
	        value={this.state.inputValue}
	        onChange={this.handleChange}
	      />    
		);
	}
}

export default Input;
