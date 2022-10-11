import React from 'react';
//import github icon from react icons
import { FaGithub } from 'react-icons/fa';



class Header extends React.Component {
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
          >
            <span aria-hidden='true'></span>
            <span aria-hidden='true'></span>
            <span aria-hidden='true'></span>
          </a>
        </div>
        <div id='navbarBasicExample' className='navbar-menu'>
          <div className='navbar-end'>
            <div className='navbar-item'>
              <a href='/' className='navbar-item'>
                Author
              </a>
              <a href='/' className='navbar-item'>
                 <FaGithub className="git-icon" /> &nbsp; Github
              </a>
            </div>
          </div>
        </div>
      </nav>      
    )
  }
}

export default Header;