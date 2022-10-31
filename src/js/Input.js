import React from 'react';


class Input extends React.Component {
	constructor(props) {
    	super(props);   
  	  this.state = {
	    	inputValue: this.props.searchString || ""
	  	};
		  this.handleChange = this.handleChange.bind(this);
	}

	handleChange(event) {
		this.setState({inputValue: event.target.value});
	}
	
	componentDidUpdate(prevProps, prevState, snapshot) {
		//logic to update search input value to correct value when new page is clicked while user had filled the input field
		if(prevProps.offSet !== this.props.offSet) {
			this.setState({inputValue: this.props.searchString});
		}
	}

	render() {				
		return (
			 <input 
	        name="search" 
	        id="search" 
	        className="input is-large" 
	        type="text" 
	        placeholder={this.props.placeHolder} 
	        value={this.state.inputValue}
	        onChange={this.handleChange}
	      />    
		);
	}
}

export default Input;
