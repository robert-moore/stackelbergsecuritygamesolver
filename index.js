var _ = require('lodash');
var d3 = require('d3');
var fs = require('fs');
var solver = require('javascript-lp-solver');


exports.ssgSolver = function(utilities) {
    var m = 1;
    var n = utilities.length;
    var z = getZValue(utilities, m, n);
    var variables = getVariables(n);

    var objective = ["max: d"];
    var constraints = getConstraintStringArray(utilities, m, n, z, variables);
    var integerDomainRestrictions = getDomainArray([], n);
    var stackelbergModel = _.concat(objective, constraints, integerDomainRestrictions);

    var formattedModel = solver.ReformatLP(stackelbergModel);
    var solution = solver.Solve(formattedModel);

    return solution;

    function getAttackConstraint(utilities, m, n, z) {
        var constraint = zeros(2 + 2 * n);
        for(var ind = 0; ind < n; ind++) {
            constraint[getIndex("r" + ind, n)] = 1;
        }
        var compare = ">=";
        var constant = 1;
        return {constraint: constraint, constant: constant, compare: compare};
    }

    //intArr represents an array of all variables which should be restricted to integers
    function getDomainArray(intArr, n) {
        var domains = [];
        _.each(intArr, function(d) {
            if(d == "c" || d == "r") {
                _.times(n, function(i) {
                    domains.push("int " + d + i);
                })
            } else {
                domains.push("int " + d);
            }
        });
        return domains;
    }

    function getVariableConstraints(m, n) {
        var defenseVariableConstraintsLow = _.map(_.range(n), function(i) {
            var constraint = zeros(2 + 2*n);
            constraint[getIndex("c" + i, n)] = 1;
            return {constant: 0, compare: ">=", constraint: constraint};
        });
        var defenseVariableConstraintsHigh = _.map(_.range(n), function(i) {
            var constraint = zeros(2 + 2*n);
            constraint[getIndex("c" + i, n)] = 1;
            return {constant: 1, compare: "<=", constraint: constraint};
        });
        var attackVariableConstraintsLow = _.map(_.range(n), function(i) {
            var constraint = zeros(2 + 2*n);
            constraint[getIndex("r" + i, n)] = 1;
            return {constant: 0, compare: ">=", constraint: constraint};
        });
        var attackVariableConstraintsHigh = _.map(_.range(n), function(i) {
            var constraint = zeros(2 + 2*n);
            constraint[getIndex("r" + i, n)] = 1;
            return {constant: 1, compare: "<=", constraint: constraint};
        });
        return _.concat(defenseVariableConstraintsLow, defenseVariableConstraintsHigh, attackVariableConstraintsLow, attackVariableConstraintsHigh);
    }

    function getConstraintStringArray(utilities, m, n, z, variables) {
        return _.map(getConstraintMatrix(utilities, m, n, z), function(d) {
            return constraintToString(d, variables);
        });
    }

    function constraintToString(constraint, variables) {
        var constraintString = _.join(_.map(constraint.constraint, function(d, i) {
            if(d == 0) {
                return '';
            } else {
                return  d + ' ' + variables[i] + ' ';
            }
        }), '');
        return _.join(_.concat(constraintString, constraint.compare + ' ' , constraint.constant), '');
    }

    function getConstraintMatrix(utilities, m, n, z) {
        var attackConstraint = getAttackConstraint(utilities, m, n, z);
        var defenseConstraint = getDefenseConstraint(utilities, m, n, z);
        var defenderConstraints = _.map(_.range(n), function(i) {
            return getDefenderConstraint(utilities, m, n, z, i);
        });
        var attackerLowerConstraints = _.map(_.range(n), function(i) {
            return getAttackerLowerConstraint(utilities, m, n, z, i);
        });
        var attackerUpperConstraints = _.map(_.range(n), function(i) {
            return getAttackerUpperConstraint(utilities, m, n, z, i);
        });
        var variableConstraints = getVariableConstraints(m, n);
        return _.concat(attackConstraint, defenseConstraint, defenderConstraints, attackerLowerConstraints, attackerUpperConstraints, variableConstraints);
    }

    function getDefenseConstraint(utilities, m, n, z) {
        var constraint = zeros(2 + 2 * n);
        for(var ind = 0; ind < n; ind++) {
            constraint[getIndex("c" + ind, n)] = 1;
        }
        var compare = "<=";
        var constant = m;
        return {constraint: constraint, constant: constant, compare: compare};
    }

    function getDefenderConstraint(utilities, m, n, z, i) {
        var constraint = zeros(2 + 2 * n);
        constraint[getIndex("d", n)] = 1;
        constraint[getIndex("c" + i, n)] = -defenderDelta(utilities, i);
        constraint[getIndex("r" + i, n)] = z;
        var compare = "<=";
        var constant = z + defenderUtility(utilities, i, "uncovered");
        return {constraint: constraint, constant: constant, compare: compare};
    }

    function getAttackerUpperConstraint(utilities, m, n, z, i) {
        var constraint = zeros(2 + 2 * n);
        constraint[getIndex("k", n)] = 1;
        constraint[getIndex("c" + i, n)] = -attackerDelta(utilities, i);
        constraint[getIndex("r" + i, n)] = z;
        var compare = "<=";
        var constant = z + attackerUtility(utilities, i, "uncovered");
        return {constraint: constraint, constant: constant, compare: compare};
    }

    function getAttackerLowerConstraint(utilities, m, n, z, i) {
        var constraint = zeros(2 + 2 * n);
        constraint[getIndex("k", n)] = 1;
        constraint[getIndex("c" + i, n)] = -attackerDelta(utilities, i);
        var compare = ">=";
        var constant = attackerUtility(utilities, i, "uncovered");
        return {constraint: constraint, constant: constant, compare: compare};
    }


    function zeros(n) {
        return _.range(0, n, 0);
    }

    function getVariables(n) {
        return _.concat(['d', 'k'], getCoverageVariables(n), getRequirementVariables(n));
    }

    function getCoverageVariables(n) {
        return _.map(_.range(n), function(d) { return 'c' + d });
    }

    function getRequirementVariables(n) {
        return _.map(_.range(n), function(d) { return 'r' + d  });
    }

    function getIndex(key, n) {
        if(key == "d") return 0;
        if(key == "k") return 1;
        if(key.length == 2) {
            var offset = 2 + (key[0] == "c" ? 0 : n);
            return offset + +key[1];
        }
    }

    function defenderUtility(utilities, target, covered) {
        return utilities[target]['defender'][covered];
    }
    function attackerUtility(utilities, target, covered) {
        return utilities[target]['attacker'][covered];
    }

    function defenderDelta(utilities, target) {
        return defenderUtility(utilities, target, "covered") - defenderUtility(utilities, target, "uncovered");
    }

    function attackerDelta(utilities, target) {
        return attackerUtility(utilities, target, "covered") - attackerUtility(utilities, target, "uncovered");
    }

    function getZValue(utilities, m, n) {
        return maxUtility = getMaxUtility(utilities) * m;
    }

    function getMaxUtility(utilities) {
        return _.max(_.map(utilities, function(d) {
            return getMaxAbsoluteValue(d);
        }));
    }

    // drills down a (utility) object looking for max values
    function getMaxAbsoluteValue(d){
        if(typeof d === "number") {
            return Math.abs(d);
        } else if(typeof d === "object") {
            return _.max(_.map(_.keys(d), function(key) {
                return getMaxAbsoluteValue(d[key]);
            }));
        } else {
            return -1;
        }
    }
};
