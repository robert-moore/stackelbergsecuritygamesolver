# Stackelberg Security Game Solver

An implementation of the [ERASER](http://teamcore.usc.edu/papers/2009/aamas-09-industry.pdf) algorithm to solve Stackelberg Security Games. 

## Motivation

Stackelberg Security Games have emerged as a powerful framework for solving difficult security challenges. For more details, check out http://teamcore.usc.edu/projects/security/. 

## Code Example

Input an array of targets, each with a utility for the attacker and defender in covered and uncovered scenarios.

    [
      {
        "defender": {
          "covered": 2,
          "uncovered": -10
        },
        "attacker": {
          "covered": -7,
          "uncovered": 4
        }
      },
      {
        "defender": {
          "covered": 7,
          "uncovered": -4
        },
        "attacker": {
          "covered": -1,
          "uncovered": 3
        }
      }
    ]

Returned is an array which includes expected defender utility and the corresponding coverage solution.
