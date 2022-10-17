import React from 'react';
//import github icon from react icons
import { FaGithub } from 'react-icons/fa';



class Header extends React.Component {

  constructor(props) {
    super(props);
    this.toggleMenu = this.toggleMenu.bind(this);
  }
  toggleMenu(e){
    //toggle class .is-active on current target and target's parent's mext sibling
    e.currentTarget.classList.toggle('is-active');
    e.currentTarget.closest('.navbar').querySelector('.navbar-menu').classList.toggle('is-active');


  }



  render (){
    return (      
      <nav className='navbar section' role='navigation' aria-label='main navigation'>
        <div className='navbar-brand'>
          <a href='/' className='navbar-item'>
            <img
              src={require("../images/musical-note.png")}
              alt='Logo'              
            />
            <span className="logo-text">reactRadio</span>  
          </a>
          <a
            role='button'
            className={'navbar-burger burger'}
            aria-label='menu'
            aria-expanded='false'
            data-target='navbarBasicExample'
            onClick={this.toggleMenu}
          >
            <span aria-hidden='true'></span>
            <span aria-hidden='true'></span>
            <span aria-hidden='true'></span>
          </a>
        </div>
        <div id='navbarBasicExample' className='navbar-menu'>
          <div className='navbar-end'>            
            <a href='https://www.linkedin.com/in/anupamkhosla/' className='navbar-item'>
              Author
            </a>
            <a href='https://github.com/AnupamKhosla/reactMusic/tree/master' className='navbar-item'>
               <FaGithub className="git-icon" /> &nbsp; Github
            </a>            
          </div>
        </div>
      </nav>      
    )
  }
}

export default Header;